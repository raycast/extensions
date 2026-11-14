/* global WebExtensionPolicy, Services */
// Temporary privileged-console integration. Rerun after Zen/companion restarts.
// Only changes the App Hopper Zen companion's window wrappers; no disk writes.
(() => {
  globalThis.appHopperZenBridge?.stop();
  const policy = WebExtensionPolicy.getByID("app-hopper-firefox@chenghsj");
  const candidate = policy?.extension;
  if (!candidate?.windowManager) throw new Error("Load App Hopper Companion first");
  const extension: ZenExtension = candidate;
  const patches: ZenTabPatch[] = [];
  const timer = setInterval(install, 1000);
  function install() {
    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      const manager = win.gZenWorkspaces;
      if (!manager || !extension.canAccessWindow(win)) continue;
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
      clearInterval(timer);
      for (const { wrapper, previous, replacement } of patches) {
        if (wrapper.getTabs !== replacement) continue;
        if (previous) Object.defineProperty(wrapper, "getTabs", previous);
        else delete wrapper.getTabs;
      }
      delete globalThis.appHopperZenBridge;
    },
  };
  try {
    install();
  } catch (error) {
    globalThis.appHopperZenBridge.stop();
    throw error;
  }
  return "Temporary bridge active. Refresh App Hopper; test cross-workspace selection. Undo: appHopperZenBridge.stop()";
})();
