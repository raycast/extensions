/* global ChromeUtils */
// AutoConfig may not provide the Browser Console logger.
function reportError(error: unknown) {
  try {
    globalThis.Services?.console.logStringMessage("App Hopper Zen bridge: " + String(error));
  } catch {
    // Optional bridge diagnostics and cleanup must not interrupt browser startup.
  }
}
// Optional integration failures must never abort browser startup.
try {
  // App Hopper local privileged integration, loaded by AutoConfig.
  // Only changes the App Hopper Zen companion's window wrappers; no disk writes.
  (() => {
    globalThis.appHopperZenBridge?.stop();
    const { setInterval, clearInterval } = ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs");
    const Services = globalThis.Services;
    if (!Services) throw new Error("AutoConfig Services API is unavailable");
    const patches: ZenTabPatch[] = [];
    let timer: number | undefined;
    let stopped = false;
    function tick() {
      try {
        install();
      } catch (error) {
        reportError(error);
      }
    }
    function start() {
      if (stopped || timer !== undefined) return;
      timer = setInterval(tick, 1000);
      tick();
    }
    const startupObserver = { observe: start };
    Services.obs.addObserver(startupObserver, "browser-delayed-startup-finished");
    function install() {
      for (const win of Services.wm.getEnumerator("navigator:browser")) {
        const manager = win.gZenWorkspaces;
        if (win.closed || !manager) continue;
        const extension = win.WebExtensionPolicy?.getByID("app-hopper-firefox@chenghsj")?.extension;
        if (!extension?.windowManager || !extension.canAccessWindow(win)) continue;
        const wrapper = extension.windowManager.getWrapper(win);
        if (patches.some((p) => p.wrapper === wrapper)) continue;
        const previous = Object.getOwnPropertyDescriptor(wrapper, "getTabs");
        const replacement = function* () {
          for (const nativeTab of manager.allStoredTabs) {
            if (nativeTab.hasAttribute("zen-empty-tab")) continue;
            const tab = extension.tabManager.getWrapper(nativeTab);
            if (tab) yield tab;
          }
        };
        Object.defineProperty(wrapper, "getTabs", { value: replacement, configurable: true });
        patches.push({ wrapper, previous, replacement });
      }
    }
    globalThis.appHopperZenBridge = {
      stop() {
        stopped = true;
        if (timer !== undefined) clearInterval(timer);
        Services.obs.removeObserver(startupObserver, "browser-delayed-startup-finished");
        for (const { wrapper, previous, replacement } of patches) {
          if (wrapper.getTabs !== replacement) continue;
          if (previous) Object.defineProperty(wrapper, "getTabs", previous);
          else delete wrapper.getTabs;
        }
        delete globalThis.appHopperZenBridge;
      },
    };
    // Also support manual loading after the first browser window initialized.
    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      if (win.gBrowserInit?.delayedStartupFinished) {
        start();
        break;
      }
    }
    return "Temporary bridge active. Refresh App Hopper; test cross-workspace selection. Undo: appHopperZenBridge.stop()";
  })();
} catch (error) {
  try {
    globalThis.appHopperZenBridge?.stop();
  } catch {
    // Optional bridge diagnostics and cleanup must not interrupt browser startup.
  }
  reportError(error);
}
