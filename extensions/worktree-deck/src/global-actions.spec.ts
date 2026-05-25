import { describe, expect, it } from "vitest";
import { buildGlobalActionItems } from "./global-actions";

describe("buildGlobalActionItems", () => {
  it("グローバル操作の一覧を返す", () => {
    const items = buildGlobalActionItems();
    expect(items.map((item) => item.id)).toEqual([
      "reload-worktrees",
      "create-worktree",
      "restore-deleted-worktree",
      "settings",
      "extension-preferences",
    ]);
  });

  it("Reload Worktrees は cmd+r のショートカットを持つ", () => {
    const items = buildGlobalActionItems();
    const target = items.find((item) => item.id === "reload-worktrees");
    expect(target?.shortcut).toEqual({ modifiers: ["cmd"], key: "r" });
  });

  it("Create Worktree は cmd+n のショートカットを持つ", () => {
    const items = buildGlobalActionItems();
    const target = items.find((item) => item.id === "create-worktree");
    expect(target?.shortcut).toEqual({ modifiers: ["cmd"], key: "n" });
  });

  it("Settings は cmd+shift+, のショートカットを持つ", () => {
    const items = buildGlobalActionItems();
    const target = items.find((item) => item.id === "settings");
    expect(target?.shortcut).toEqual({ modifiers: ["cmd", "shift"], key: "," });
    expect(target?.title).toBe("Settings");
  });

  it("Restore Deleted Worktree は cmd+shift+r のショートカットを持つ", () => {
    const items = buildGlobalActionItems();
    const target = items.find((item) => item.id === "restore-deleted-worktree");
    expect(target?.shortcut).toEqual({ modifiers: ["cmd", "shift"], key: "r" });
  });

  it("Open Extension Preferences は Raycast 予約ショートカットを明示しない", () => {
    const items = buildGlobalActionItems();
    const target = items.find((item) => item.id === "extension-preferences");
    expect(target?.shortcut).toBeUndefined();
  });
});
