import type { Keyboard } from "@raycast/api";

export function importantShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    modifiers: process.platform === "win32" ? ["ctrl", "shift"] : ["cmd", "shift"],
    key,
  };
}
