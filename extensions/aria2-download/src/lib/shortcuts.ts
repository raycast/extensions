import { Keyboard } from "@raycast/api";

export function ctrlShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    Windows: { modifiers: ["ctrl"], key },
    macOS: { modifiers: ["cmd"], key },
  };
}
