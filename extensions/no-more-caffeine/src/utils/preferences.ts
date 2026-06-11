import { getPreferenceValues } from "@raycast/api";
import { Settings } from "../types";

/**
 * Get user preferences and convert them to Settings object
 * Uses the auto-generated `Preferences` type from raycast-env.d.ts
 * Adds basic validation for bedtime format (HH:mm) to avoid NaN propagation.
 */
export function getSettings(): Settings {
  const preferences = getPreferenceValues<Preferences>();

  const bedtimeRaw = preferences.bedtime || "22:00";
  let bedtime = "22:00";

  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(bedtimeRaw);
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (Number.isFinite(h) && Number.isFinite(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      bedtime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    } else {
      console.warn(`Invalid bedtime preference "${bedtimeRaw}", falling back to 22:00`);
    }
  } else {
    console.warn(`Invalid bedtime preference "${bedtimeRaw}", falling back to 22:00`);
  }

  return {
    bedtime,
    halfLife: parseFloat(preferences.halfLife || "5"),
    maxCaffeineAtBedtime: parseFloat(preferences.maxCaffeineAtBedtime || "50"),
    dailyMaxCaffeine: preferences.dailyMaxCaffeine ? parseFloat(preferences.dailyMaxCaffeine) : undefined,
  };
}
