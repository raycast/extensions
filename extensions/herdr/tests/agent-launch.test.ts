import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareAgentPane } from "../src/lib/agent-launch";
import { runHerdrJson } from "../src/lib/herdr";
import type { HerdrSnapshot, PaneInfo } from "../src/lib/types";

vi.mock("../src/lib/herdr", () => ({
  runHerdrJson: vi.fn(),
}));

const snapshot: HerdrSnapshot = {
  version: "test",
  protocol: 1,
  focused_workspace_id: "workspace-1",
  focused_tab_id: "tab-1",
  focused_pane_id: "pane-1",
  workspaces: [],
  tabs: [],
  panes: [],
  agents: [],
  layouts: [],
};

const createdPane: PaneInfo = {
  pane_id: "pane-created",
  tab_id: "tab-created",
  workspace_id: "workspace-created",
  terminal_id: "terminal-created",
  focused: false,
};

describe("prepareAgentPane", () => {
  beforeEach(() => {
    vi.mocked(runHerdrJson).mockReset();
  });

  it("uses the root pane returned by workspace creation", async () => {
    vi.mocked(runHerdrJson).mockResolvedValue({ root_pane: createdPane });

    await expect(
      prepareAgentPane("new-workspace", snapshot, { name: "Review", environment: [] }),
    ).resolves.toBe("pane-created");
  });

  it("uses the pane returned by a split instead of inferring from focus", async () => {
    vi.mocked(runHerdrJson).mockResolvedValue({ pane: createdPane });

    await expect(
      prepareAgentPane("split-right", snapshot, { name: "Review", environment: [] }),
    ).resolves.toBe("pane-created");
  });

  it("returns an existing pane without creating a destination", async () => {
    await expect(
      prepareAgentPane("pane:pane-existing", snapshot, { name: "Review", environment: [] }),
    ).resolves.toBe("pane-existing");
    expect(runHerdrJson).not.toHaveBeenCalled();
  });
});
