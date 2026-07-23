import { describe, expect, it } from "vitest";
import { findCreatedPane } from "../src/lib/agent-destination";
import type { HerdrSnapshot, PaneInfo, TabInfo, WorkspaceInfo } from "../src/lib/types";

function snapshot({
  panes,
  workspaces = [],
  tabs = [],
}: {
  panes: PaneInfo[];
  workspaces?: WorkspaceInfo[];
  tabs?: TabInfo[];
}): HerdrSnapshot {
  return {
    version: "test",
    protocol: 1,
    workspaces,
    tabs,
    panes,
    agents: [],
    layouts: [],
  };
}

const existingPane = {
  pane_id: "pane-1",
  tab_id: "tab-1",
  workspace_id: "workspace-1",
  terminal_id: "terminal-1",
  focused: true,
};

describe("findCreatedPane", () => {
  it("finds the pane in a newly created workspace", () => {
    const before = snapshot({ panes: [existingPane] });
    const newPane = {
      ...existingPane,
      pane_id: "pane-2",
      tab_id: "tab-2",
      workspace_id: "workspace-2",
      terminal_id: "terminal-2",
    };
    const after = snapshot({ panes: [existingPane, newPane] });

    expect(findCreatedPane(before, after, "new-workspace")?.pane_id).toBe("pane-2");
  });

  it("limits new-tab matching to the selected workspace", () => {
    const before = snapshot({
      panes: [existingPane],
      tabs: [
        {
          tab_id: "tab-1",
          workspace_id: "workspace-1",
          label: "Main",
          number: 1,
          focused: true,
          pane_count: 1,
        },
      ],
    });
    const otherPane = {
      ...existingPane,
      pane_id: "pane-other",
      tab_id: "tab-other",
      workspace_id: "workspace-other",
    };
    const expectedPane = {
      ...existingPane,
      pane_id: "pane-2",
      tab_id: "tab-2",
      focused: false,
    };
    const after = snapshot({ panes: [existingPane, otherPane, expectedPane] });

    expect(findCreatedPane(before, after, "tab:workspace-1")?.pane_id).toBe("pane-2");
  });
});
