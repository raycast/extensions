import { Keyboard } from "@raycast/api";

/** ⌘ + key on macOS, Ctrl + key on Windows. */
export function cmd(key: Keyboard.KeyEquivalent, { shift = false } = {}): Keyboard.Shortcut {
  return {
    macOS: { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key },
    Windows: { modifiers: shift ? ["ctrl", "shift"] : ["ctrl"], key },
  };
}
