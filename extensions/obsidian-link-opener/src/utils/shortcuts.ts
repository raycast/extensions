import { Keyboard } from "@raycast/api";

type ExtraModifier = Exclude<Keyboard.KeyModifier, "cmd" | "ctrl">;

/**
 * Build a shortcut that uses Cmd on macOS and Ctrl on Windows
 */
export function primaryShortcut(
  key: Keyboard.KeyEquivalent,
  extraModifiers: ExtraModifier[] = []
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...extraModifiers], key },
    Windows: { modifiers: ["ctrl", ...extraModifiers], key },
  };
}
