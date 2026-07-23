import type { HerdrSnapshot, PaneInfo } from "./types";

export type AgentDestination = `pane:${string}` | `tab:${string}` | "new-workspace" | "split-right" | "split-down";

export function findCreatedPane(
  before: HerdrSnapshot,
  after: HerdrSnapshot,
  destination: AgentDestination,
): PaneInfo | undefined {
  const previousPaneIds = new Set(before.panes.map((pane) => pane.pane_id));
  let candidates = after.panes.filter((pane) => !previousPaneIds.has(pane.pane_id));

  if (destination === "new-workspace") {
    const previousWorkspaceIds = new Set(before.workspaces.map((workspace) => workspace.workspace_id));
    candidates = candidates.filter((pane) => !previousWorkspaceIds.has(pane.workspace_id));
  } else if (destination.startsWith("tab:")) {
    const workspaceId = destination.slice(4);
    const previousTabIds = new Set(before.tabs.map((tab) => tab.tab_id));
    candidates = candidates.filter((pane) => pane.workspace_id === workspaceId && !previousTabIds.has(pane.tab_id));
  }

  return candidates.find((pane) => pane.focused) || candidates[0];
}
