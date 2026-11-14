/* global Services */
// THROWAWAY PROBE: run in Zen Browser Console (browser chrome context).
// Reads live tabs only. Does not persist data or alter browser files.
// Listing does not switch workspaces. focus(index) explicitly selects a tab.
globalThis.appHopperZenProbe = (() => {
  const win = Services.wm.getMostRecentWindow("navigator:browser");
  if (!win?.gZenWorkspaces) throw new Error("No Zen browser window");
  const manager = win.gZenWorkspaces;
  const tabs = Array.from(manager.allStoredTabs).filter((tab) => !tab.hasAttribute("zen-empty-tab"));
  const rows = tabs.map((tab, index) => ({
    index,
    title: tab.label,
    workspace: tab.getAttribute("zen-workspace-id"),
    current: tab.getAttribute("zen-workspace-id") === manager.activeWorkspace,
  }));
  console.table(rows);
  return {
    rows,
    async focus(index: number) {
      const tab = tabs[index];
      if (!tab?.isConnected) throw new Error("Tab changed: rerun the probe");
      const workspace = tab.getAttribute("zen-workspace-id");
      if (workspace && workspace !== manager.activeWorkspace) {
        await manager.changeWorkspaceWithID(workspace);
      }
      win.gBrowser.selectedTab = tab;
      win.focus();
      return { workspace: manager.activeWorkspace, selected: win.gBrowser.selectedTab === tab };
    },
  };
})();
