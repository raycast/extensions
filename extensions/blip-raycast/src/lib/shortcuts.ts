import type { Keyboard } from "@raycast/api";

type Key = Keyboard.KeyEquivalent;

/** ⌘ on macOS, Ctrl on Windows, plus optional Shift. */
export function primaryShortcut(key: Key, withShift = false): Keyboard.Shortcut {
  return {
    macOS: { modifiers: withShift ? ["cmd", "shift"] : ["cmd"], key },
    Windows: { modifiers: withShift ? ["ctrl", "shift"] : ["ctrl"], key },
  };
}
