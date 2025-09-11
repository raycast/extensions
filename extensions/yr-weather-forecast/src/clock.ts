import { getPreferenceValues } from "@raycast/api";

export type ClockFormat = "12h" | "24h";

export function getClockFormat(): ClockFormat {
  const prefs = getPreferenceValues<{ clockFormat?: ClockFormat }>();
  return (prefs.clockFormat as ClockFormat) ?? "24h";
}
