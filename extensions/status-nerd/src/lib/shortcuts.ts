import { Keyboard } from "@raycast/api";

/** Cmd on macOS, Ctrl on Windows — required for ambiguous modifiers per Raycast lint. */
export function cmdShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd"], key },
    Windows: { modifiers: ["ctrl"], key },
  };
}
