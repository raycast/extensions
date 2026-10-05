import type { Keyboard } from "@raycast/api";

export const actionShortcut = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", "shift"], key },
  Windows: { modifiers: ["ctrl", "shift"], key },
});
