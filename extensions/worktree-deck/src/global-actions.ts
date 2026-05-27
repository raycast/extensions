import type { Keyboard } from "@raycast/api";

/**
 * グローバルで使えるアクションの識別子
 */
export type GlobalActionId =
  | "reload-worktrees"
  | "create-worktree"
  | "restore-deleted-worktree"
  | "settings"
  | "extension-preferences";

/**
 * グローバルアクションの定義
 */
type GlobalActionItem = {
  id: GlobalActionId;
  title: string;
  shortcut?: Keyboard.Shortcut;
};

/**
 * 一覧内で常に表示するアクション定義を構築する
 */
export function buildGlobalActionItems(): GlobalActionItem[] {
  return [
    {
      id: "reload-worktrees",
      title: "Reload Worktrees",
      shortcut: { modifiers: ["cmd"], key: "r" },
    },
    {
      id: "create-worktree",
      title: "Create Worktree",
      shortcut: { modifiers: ["cmd"], key: "n" },
    },
    {
      id: "restore-deleted-worktree",
      title: "Restore Deleted Worktree",
      shortcut: { modifiers: ["cmd", "shift"], key: "r" },
    },
    {
      id: "settings",
      title: "Settings",
      shortcut: { modifiers: ["cmd", "shift"], key: "," },
    },
    {
      id: "extension-preferences",
      title: "Open Extension Preferences",
    },
  ];
}
