import { homedir } from "node:os";
import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Color: { Blue: "blue", Red: "red", Green: "green", SecondaryText: "secondary", Yellow: "yellow" },
  Icon: { Bolt: "bolt", ExclamationMark: "exclamation", CircleFilled: "circle" },
}));

const { abbreviatePath, tabLabel } = await import("../src/lib/ui");

describe("tabLabel", () => {
  // Regression: herdr defaults an unrenamed tab's label to its number, so
  // "1" rendered as if it were a real name and disambiguated nothing between
  // tabs in different workspaces.
  it("treats a label equal to the tab number as unlabeled", () => {
    expect(tabLabel({ tab_id: "w1:t1", workspace_id: "w1", label: "1", number: 1, focused: false, pane_count: 1 })).toBeUndefined();
  });

  it("keeps a real label", () => {
    expect(
      tabLabel({ tab_id: "w1:t1", workspace_id: "w1", label: "main", number: 1, focused: false, pane_count: 1 }),
    ).toBe("main");
  });

  it("returns undefined without a tab", () => {
    expect(tabLabel(undefined)).toBeUndefined();
  });
});

describe("abbreviatePath", () => {
  it("collapses the home directory to a tilde", () => {
    expect(abbreviatePath(`${homedir()}/src/dotfiles`)).toBe("~/src/dotfiles");
    expect(abbreviatePath(homedir())).toBe("~");
  });

  it("leaves paths outside the home directory untouched", () => {
    expect(abbreviatePath("/opt/homebrew/bin/herdr")).toBe("/opt/homebrew/bin/herdr");
  });

  it("returns undefined without a path", () => {
    expect(abbreviatePath(undefined)).toBeUndefined();
  });
});
