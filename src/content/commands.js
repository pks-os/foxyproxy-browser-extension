// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/commands/onCommand
// https://developer.chrome.com/docs/extensions/reference/commands/#event-onCommand
// Chrome commands returns command, tab
// https://bugzilla.mozilla.org/show_bug.cgi?id=1843866
// Add tab parameter to commands.onCommand (fixed in Firefox 126)

import {App} from './app.js';
import {Proxy} from './proxy.js';
import {OnRequest} from './on-request.js';

// ---------- Commands (Side Effect) ------------------------
class Commands {

  static {
    // commands is not supported on Android
    browser.commands?.onCommand.addListener((...e) => this.process(...e));
  }

  static async process(name, tab) {
    const pref = await browser.storage.local.get();
    const host = pref.commands[name];
    const needTab = ['quickAdd', 'excludeHost', 'setTabProxy', 'unsetTabProxy'].includes(name);
    tab ||= needTab && (await browser.tabs.query({currentWindow: true, active: true}))[0];

    switch (name) {
      case 'proxyByPatterns':
        this.set(pref, 'pattern');
        break;

      case 'disable':
        this.set(pref, 'disable');
        break;

      case 'setProxy':
        host && this.set(pref, host);
        break;

      case 'quickAdd':
        host && Proxy.quickAdd(pref, host, tab);
        break;

      case 'excludeHost':
        Proxy.excludeHost(pref, tab);
        break;

      case 'setTabProxy':
        if (!App.firefox || !host) { break; }               // firefox only

        const proxy = pref.data.find(i => i.active && host === `${i.hostname}:${i.port}`);
        proxy && OnRequest.setTabProxy(tab, proxy);
        break;

      case 'unsetTabProxy':
        if (!App.firefox) { break; }                        // firefox only

        OnRequest.setTabProxy(tab);
        break;
    }
  }

  static set(pref, mode) {
    pref.mode = mode;
    browser.storage.local.set({mode});                      // save mode
    Proxy.set(pref);
  }
}