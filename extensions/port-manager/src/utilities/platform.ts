import { Keyboard } from "@raycast/api";

export const isWindows = process.platform === "win32";

export function platformShortcut(macOS: Keyboard.Shortcut, windows: Keyboard.Shortcut): Keyboard.Shortcut {
  return isWindows ? windows : macOS;
}
