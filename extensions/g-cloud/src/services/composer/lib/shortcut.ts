import { Keyboard } from "@raycast/api";

/** A shortcut defined once for macOS, with Cmd mapped to Ctrl on Windows. */
export function hotkey(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  const windows = Array.from(new Set(modifiers.map((m) => (m === "cmd" ? "ctrl" : m))));
  return { macOS: { modifiers, key }, Windows: { modifiers: windows, key } };
}
