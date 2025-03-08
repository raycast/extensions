import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  "easing-format": "motion-compact" | "motion-standard";
}

export function getEasingFormat(): "motion-compact" | "motion-standard" {
  const preferences = getPreferenceValues<Preferences>();
  return preferences["easing-format"];
}
