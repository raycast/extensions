import { getPreferenceValues } from "@raycast/api";

import { Preferences } from "./models";

export const getPreferences = () => getPreferenceValues<Preferences>();

export function getVolumeStep(): number {
  const { volumeSteps: step = "10" } = getPreferences();
  const parsedStep = Number.parseInt(step, 10);
  return Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : 10;
}

export function getHudDisabled(): boolean {
  const { disableHUD: hide = false } = getPreferences();
  return hide;
}
