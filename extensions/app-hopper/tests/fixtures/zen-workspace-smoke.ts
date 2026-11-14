/* global Services, ChromeUtils, Components, APP_HOPPER_TEST_TOKEN, APP_HOPPER_TEST_EXTENSION */
// Test-only AutoConfig fixture: never install in a personal profile.
Services.obs.addObserver(
  {
    observe(subject) {
      (async () => {
        const win = subject;
        const manager = win.gZenWorkspaces;
        if (!manager) throw new Error("Zen workspace manager unavailable");
        await manager.promiseInitialized;
        const firstWorkspace = manager.activeWorkspace;
        const first = win.gBrowser.addTab("about:blank#app-hopper-" + APP_HOPPER_TEST_TOKEN + "-first", {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
        win.gBrowser.selectedTab = first;
        const secondWorkspace = await manager.createAndSaveWorkspace("App Hopper Test");
        if (!secondWorkspace) throw new Error("Cannot create test workspace");
        const second = win.gBrowser.addTab("about:blank#app-hopper-" + APP_HOPPER_TEST_TOKEN + "-second", {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
        win.gBrowser.selectedTab = second;
        await manager.changeWorkspaceWithID(firstWorkspace);
        win.gBrowser.selectedTab = first;
        const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
        const file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        file.initWithPath(APP_HOPPER_TEST_EXTENSION);
        await AddonManager.installTemporaryAddon(file);
        const { setInterval } = ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs");
        setInterval(() => {
          Services.prefs.setStringPref(
            "app-hopper.test.snapshot",
            JSON.stringify({
              workspace: manager.activeWorkspace,
              firstWorkspace,
              secondWorkspace: secondWorkspace.uuid,
              selected: win.gBrowser.selectedBrowser.currentURI.spec,
              tabs: Array.from(manager.allStoredTabs)
                .filter((t) => !t.hasAttribute("zen-empty-tab"))
                .map((t) => ({ url: t.linkedBrowser?.currentURI.spec, workspace: t.getAttribute("zen-workspace-id") })),
            }),
          );
          Services.prefs.savePrefFile(null);
        }, 500);
      })().catch((error) => {
        Services.prefs.setStringPref("app-hopper.test.error", String(error));
        Services.prefs.savePrefFile(null);
      });
    },
  },
  "browser-delayed-startup-finished",
);
