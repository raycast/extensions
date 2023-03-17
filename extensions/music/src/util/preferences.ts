import { getPreferenceValues } from "@raycast/api";

import { Preferences } from "./models";

export const getPreferences = () => getPreferenceValues<Preferences>();

export function getVolumeStep(): number {
  const { volumeSteps: step = "10" } = getPreferences();
  return parseInt(step) ?? 10;
}
