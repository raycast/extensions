import { getPreferenceValues } from "@raycast/api";
import { Thresholds, thresholdsFrom } from "./analysis/thresholds";

// Preferences is generated from package.json into raycast-env.d.ts, so it cannot drift from the manifest.
export function thresholds(): Thresholds {
  return thresholdsFrom(getPreferenceValues<Preferences>());
}

export function notifyRunaways(): boolean {
  return getPreferenceValues<Preferences>().notifyRunaways ?? true;
}
