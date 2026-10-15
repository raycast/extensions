import { Keyboard } from "@raycast/api";

/**
 * Shortcuts shared across views so the same key does the same thing everywhere.
 * `cmd` is ambiguous across platforms, so each shortcut declares both variants;
 * Raycast would otherwise ignore it on Windows.
 */
function crossPlatform(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", "shift"], key },
    Windows: { modifiers: ["ctrl", "shift"], key },
  };
}

export const SWITCH_PROJECT_SHORTCUT = crossPlatform("s");
export const TOGGLE_NAME_SHORTCUT = crossPlatform("t");
export const RECENT_CHANGES_SHORTCUT = crossPlatform("l");
export const FLAG_HISTORY_SHORTCUT = crossPlatform("h");
