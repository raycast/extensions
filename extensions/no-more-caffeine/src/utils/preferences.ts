import { getPreferenceValues } from "@raycast/api";
import { Settings } from "../types";

interface Preferences {
  bedtime: string;
  halfLife: string;
  maxCaffeineAtBedtime: string;
  dailyMaxCaffeine?: string;
}
/**
 * Get user preferences and convert them to Settings object
 */
export function getSettings(): Settings {
  const preferences = getPreferenceValues<Preferences>();

  return {
    bedtime: preferences.bedtime || "22:00",
    halfLife: parseFloat(preferences.halfLife || "5"),
    maxCaffeineAtBedtime: parseFloat(preferences.maxCaffeineAtBedtime || "50"),
    dailyMaxCaffeine: preferences.dailyMaxCaffeine ? parseFloat(preferences.dailyMaxCaffeine) : undefined,
  };
}
