import type { Keyboard } from "@raycast/api";

/** ⌘ on macOS and Ctrl on Windows, with optional Shift, for the same key. */
export function shortcut(key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut {
  return {
    macOS: { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key },
    Windows: { modifiers: shift ? ["ctrl", "shift"] : ["ctrl"], key },
  };
}
