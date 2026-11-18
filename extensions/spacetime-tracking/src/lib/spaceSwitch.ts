import { runAppleScript } from "@raycast/utils";
import { switchShortcutForIndex } from "./desktopShortcuts";

/**
 * Switches to the space at a given position by synthesizing the macOS keyboard
 * shortcut for that desktop (e.g. position 1 → Ctrl+1 → "Switch to Desktop 1").
 * The shortcut is derived from the space's current position in the macOS order,
 * so reordering desktops is followed automatically. Requires Accessibility
 * permission for Raycast and that the macOS "Switch to Desktop N" shortcuts are
 * enabled (done by the Setup / first-run defaults).
 */
export async function switchToSpace(index: number): Promise<void> {
  const shortcut = switchShortcutForIndex(index);
  if (!shortcut) {
    throw new Error(`Space ${index} can't be switched to with a keyboard shortcut (only positions 1–11).`);
  }
  const using = shortcut.modifiers.length ? ` using {${shortcut.modifiers.join(", ")}}` : "";
  await runAppleScript(`tell application "System Events" to key code ${shortcut.keyCode}${using}`);
}

/**
 * Returns true if Raycast has permission to synthesize keystrokes. Probes with a
 * harmless empty keystroke via System Events — succeeds when granted, throws
 * (and may show the permission prompt) when not.
 */
export async function checkAccessibility(): Promise<boolean> {
  try {
    await runAppleScript(`tell application "System Events" to keystroke ""`);
    return true;
  } catch {
    return false;
  }
}
