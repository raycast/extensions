import { runAppleScript } from "@raycast/utils";
import { getSpaceConfig } from "./spaceNames";

/**
 * Switches to a space by synthesizing the user-configured keyboard shortcut
 * (e.g. Ctrl+1 → "Switch to Desktop 1"). This delegates to macOS's own space
 * switching, which — unlike the private WindowServer calls — is honored from a
 * normal process. Requires Accessibility permission for Raycast and that the
 * matching macOS shortcut is enabled.
 */
export async function switchToSpace(id: number): Promise<void> {
  const cfg = getSpaceConfig(id);
  if (!cfg?.keyCode) {
    throw new Error("No shortcut set. Add a Key Code for this space in the Spaces List.");
  }
  const mods = (cfg.modifiers ?? []).join(", ");
  const using = mods ? ` using {${mods}}` : "";
  await runAppleScript(`tell application "System Events" to key code ${cfg.keyCode}${using}`);
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
