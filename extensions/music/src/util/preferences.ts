import { getPreferenceValues } from "@raycast/api";

import { Preferences } from "./models";

export const getPreferences = () => getPreferenceValues<Preferences>();

export function getVolumeStep(): number {
  const { volumeSteps: step = "10" } = getPreferences();
  const parsedStep = Number.parseInt(step, 10);
  return Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : 10;
}

/** Seconds that Rewind and Fast Forward move by. Fixed for now; a preference
 * can plug in here without touching the commands. */
export function getSeekSeconds(): number {
  return 15;
}

export function getHudDisabled(): boolean {
  const { disableHUD: hide = false } = getPreferences();
  return hide;
}
