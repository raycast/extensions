import { getAppPreferences } from "./preferences";

export type ClockFormat = "12h" | "24h";

export function getClockFormat(): ClockFormat {
  const prefs = getAppPreferences();
  return (prefs.clockFormat as ClockFormat) ?? "24h";
}
