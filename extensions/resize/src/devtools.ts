import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { measure, setBounds } from "./chrome";

// Width reserved for a right-docked DevTools panel so the emulated device
// renders at 100% scale without shrinking.
const DEVTOOLS_DOCK = 620;

// Chrome blocks opening DevTools programmatically except via keystrokes, so this
// needs Raycast's Accessibility permission (System Events). ⌥⌘I is a toggle: from a
// closed state it opens DevTools, then ⌘⇧M turns on device mode. AppleScript cannot
// read DevTools' open/closed state (it is not a separate window when docked), so if
// DevTools is already open the keystroke closes it — the HUD tells the user to press
// ⌘⇧M themselves in that case. The keystroke runs before the resize so that a missing
// Accessibility permission fails fast and leaves the window untouched.
const SCRIPT = `
tell application "Google Chrome" to activate
delay 0.3
tell application "System Events"
	keystroke "i" using {command down, option down}
	delay 0.5
	keystroke "m" using {command down, shift down}
end tell`;

export async function openDeviceMode(
  deviceName: string,
  viewport?: { w: number; h: number },
): Promise<void> {
  try {
    await closeMainWindow();
    await runAppleScript(SCRIPT);
    if (viewport) {
      const m = await measure().catch(() => undefined);
      if (m) {
        const outerW = Math.min(m.avail.w, viewport.w + DEVTOOLS_DOCK);
        await setBounds(m.avail.left, m.avail.top, m.avail.left + outerW, m.avail.top + m.avail.h);
      }
    }
    await showHUD(`DevTools device mode — pick “${deviceName}” (⌘⇧M if DevTools was already open)`);
  } catch (e) {
    await showFailureToast(e, {
      title: "Couldn't open DevTools — Raycast may need Accessibility permission",
    });
  }
}
