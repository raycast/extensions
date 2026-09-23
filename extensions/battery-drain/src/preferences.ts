import { getPreferenceValues } from "@raycast/api";
import { ThresholdPreferences, Thresholds, thresholdsFrom } from "./analysis/thresholds";

type Preferences = ThresholdPreferences & { notifyRunaways?: boolean };

export function thresholds(): Thresholds {
  return thresholdsFrom(getPreferenceValues<Preferences>());
}

export function notifyRunaways(): boolean {
  return getPreferenceValues<Preferences>().notifyRunaways ?? true;
}
