import type { LeaderKeyAction, LeaderKeyConfig, ShortcutItem } from "../types";

export function flattenShortcuts(config: LeaderKeyConfig): ShortcutItem[] {
  const shortcuts: ShortcutItem[] = [];

  function traverse(actions: LeaderKeyAction[], currentPath = "") {
    for (const action of actions) {
      const fullPath = currentPath + action.key;

      if (action.type === "group" && action.actions) {
        traverse(action.actions, fullPath);
      } else if (action.value && action.type !== "group") {
        shortcuts.push({
          alias: fullPath,
          value: action.value,
          label: action.label,
          type: action.type as "application" | "url" | "command",
        });
      }
    }
  }

  if (config.actions) {
    traverse(config.actions);
  }

  return shortcuts;
}
