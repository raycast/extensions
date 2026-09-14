import { closeMainWindow, LocalStorage, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { measure, setBounds } from "./chrome";
import { expandForDeviceMode } from "./devtools-geometry";

export { DEVTOOLS_DOCK, expandForDeviceMode } from "./devtools-geometry";

/** Set while we believe DevTools device mode is open from our handoff. */
export const DT_HANDOFF_KEY = "devtools-handoff-active";

// Chrome blocks opening DevTools programmatically except via keystrokes, so this
// needs Raycast's Accessibility permission (System Events). ⌥⌘I and ⌘⇧M are both
// toggles — we track handoff state in LocalStorage so repeat Cycle presses don't
// close DevTools / flip device mode off.
const OPEN_SCRIPT = `
tell application "Google Chrome" to activate
delay 0.3
tell application "System Events"
	keystroke "i" using {command down, option down}
	delay 0.5
	keystroke "m" using {command down, shift down}
end tell`;

const CLOSE_SCRIPT = `
tell application "Google Chrome" to activate
delay 0.2
tell application "System Events"
	keystroke "i" using {command down, option down}
end tell`;

export async function openDeviceMode(deviceName: string, viewport?: { w: number; h: number }): Promise<void> {
  let previousBounds: { x1: number; y1: number; x2: number; y2: number } | undefined;

  try {
    await closeMainWindow();

    const alreadyOpen = (await LocalStorage.getItem<string>(DT_HANDOFF_KEY)) === "1";
    if (!alreadyOpen) {
      await runAppleScript(OPEN_SCRIPT);
      await LocalStorage.setItem(DT_HANDOFF_KEY, "1");
    }

    if (viewport) {
      // Measurement must succeed for a complete handoff — never report success
      // after a swallowed measure failure (store review feedback).
      const m = await measure();
      previousBounds = m.bounds;
      const next = expandForDeviceMode(m.bounds, m.avail, viewport);
      if (next.changed) {
        await setBounds(next.x1, next.y1, next.x2, next.y2);
      }
    }

    await showHUD(
      alreadyOpen
        ? `DevTools device mode — pick “${deviceName}”`
        : `DevTools device mode — pick “${deviceName}” (⌘⇧M if DevTools was already open)`,
    );
  } catch (e) {
    if (previousBounds) {
      try {
        await setBounds(previousBounds.x1, previousBounds.y1, previousBounds.x2, previousBounds.y2);
      } catch {
        // best-effort restore
      }
    }
    await showFailureToast(e, {
      title: "Couldn't open DevTools — Raycast may need Accessibility permission",
    });
  }
}

/** Close DevTools if we previously opened them via handoff, so window resizes measure clean chrome. */
export async function closeDeviceModeIfNeeded(): Promise<void> {
  const active = (await LocalStorage.getItem<string>(DT_HANDOFF_KEY)) === "1";
  if (!active) return;
  try {
    await runAppleScript(CLOSE_SCRIPT);
  } catch {
    // still clear the flag so we don't skip opens forever
  }
  await LocalStorage.removeItem(DT_HANDOFF_KEY);
}
