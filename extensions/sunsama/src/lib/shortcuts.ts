import { Keyboard } from "@raycast/api";

/**
 * A cross-platform shortcut: `cmd` on macOS, `ctrl` on Windows. Raycast does NOT
 * auto-map `cmd` to `ctrl` on Windows, so cmd-only shortcuts silently do nothing
 * there — these must be specified per platform.
 */
export function xShortcut(
  key: Keyboard.KeyEquivalent,
  ...extra: Keyboard.KeyModifier[]
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...extra], key },
    Windows: { modifiers: ["ctrl", ...extra], key },
  };
}
