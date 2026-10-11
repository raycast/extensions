import { getPreferenceValues, showHUD } from "@raycast/api";
import { BUTTON_LABELS, click, MouseButton, releaseAll, ReleaseMode, toggleHold } from "./mouse-buttons";
import { reportError } from "./feedback";

export async function clickCommand(button: MouseButton) {
  try {
    await click(button);
  } catch (e) {
    await reportError(e, true);
  }
}

/** The three Hold commands share the same preferences, so any one of the generated types describes them. */
type HoldPreferences = Preferences.HoldLeftClick | Preferences.HoldRightClick | Preferences.HoldMiddleClick;

export async function holdCommand(button: MouseButton) {
  try {
    const preferences = getPreferenceValues<HoldPreferences>();
    const release: ReleaseMode = preferences.release ?? "click";
    const seconds = preferences.seconds ?? "5";
    const secs = Number(seconds.replace(",", "."));
    const duration = Number.isFinite(secs) && secs > 0 ? secs : 5;
    const held = await toggleHold(button, release, duration);
    const label = BUTTON_LABELS[button];
    if (!held) {
      await showHUD(`${label} button released`);
    } else if (release === "click") {
      await showHUD(`${label} button held – click to release`);
    } else if (release === "timer") {
      await showHUD(`${label} button held for ${duration} s`);
    } else {
      await showHUD(`${label} button held – run again to release`);
    }
  } catch (e) {
    await reportError(e, true);
  }
}

export async function releaseCommand() {
  try {
    await releaseAll();
    await showHUD("All mouse buttons released");
  } catch (e) {
    await reportError(e, true);
  }
}
