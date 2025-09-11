import { getPreferenceValues } from "@raycast/api";

export type ClockFormat = "12h" | "24h";

export function getClockFormat(): ClockFormat {
  const prefs = getPreferenceValues<Preferences.Yr>();
  return (prefs.clockFormat as ClockFormat) ?? "24h";
}
