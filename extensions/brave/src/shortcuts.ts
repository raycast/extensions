import { Keyboard } from "@raycast/api";

function shortcut(
  macOS: Keyboard.KeyModifier[],
  Windows: Keyboard.KeyModifier[],
  key: Keyboard.KeyEquivalent,
): Keyboard.Shortcut {
  return { macOS: { modifiers: macOS, key }, Windows: { modifiers: Windows, key } };
}

export const SHORTCUTS = {
  closeTab: shortcut(["cmd", "shift"], ["ctrl", "shift"], "w"),
  createQuicklink: shortcut(["cmd", "shift"], ["ctrl", "shift"], "q"),
  deduplicateTabs: shortcut(["cmd", "shift", "ctrl"], ["ctrl", "shift", "alt"], "w"),
};
