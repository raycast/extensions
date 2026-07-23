import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareAgentPane } from "../src/lib/agent-launch";
import { getSnapshot, runHerdrJson } from "../src/lib/herdr";
import type { HerdrSnapshot, PaneInfo } from "../src/lib/types";

vi.mock("../src/lib/herdr", () => ({
  getSnapshot: vi.fn(),
  runHerdrJson: vi.fn(),
  HerdrError: class HerdrError extends Error {
    constructor(
      message: string,
      readonly code?: string,
    ) {
      super(message);
      this.name = "HerdrError";
    }
  },
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
    vi.mocked(getSnapshot).mockReset();
    vi.mocked(getSnapshot).mockResolvedValue(snapshot);
  });

  it("uses the root pane returned by workspace creation", async () => {
    vi.mocked(runHerdrJson).mockResolvedValue({ root_pane: createdPane });

    await expect(prepareAgentPane("new-workspace", { name: "Review", environment: [] })).resolves.toBe("pane-created");
  });

  it("uses the pane returned by a split instead of inferring from focus", async () => {
    vi.mocked(getSnapshot).mockResolvedValue({ ...snapshot, focused_pane_id: "pane-current" });
    vi.mocked(runHerdrJson).mockResolvedValue({ pane: createdPane });

    await expect(prepareAgentPane("split-right", { name: "Review", environment: [] })).resolves.toBe("pane-created");
    const [args] = vi.mocked(runHerdrJson).mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(["pane", "split", "--direction", "right"]));
    expect(args).not.toContain("pane-current");
  });

  it("throws when splitting without a focused pane", async () => {
    vi.mocked(getSnapshot).mockResolvedValue({ ...snapshot, focused_pane_id: undefined });

    await expect(prepareAgentPane("split-right", { name: "Review", environment: [] })).rejects.toThrow(
      "No focused pane is available to split.",
    );
  });

  it("returns an existing pane without creating a destination", async () => {
    await expect(prepareAgentPane("pane:pane-existing", { name: "Review", environment: [] })).resolves.toBe(
      "pane-existing",
    );
    expect(runHerdrJson).not.toHaveBeenCalled();
  });
});
