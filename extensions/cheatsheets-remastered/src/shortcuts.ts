import type { Keyboard } from "@raycast/api";

export function shortcut(key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut {
  return { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key };
}
