import { getPreferenceValues } from "@raycast/api";
import { DEFAULTS } from "../constants";

export interface ParsedPreferences {
  activeIntervalSeconds: number;
  activeIntervalMinutes: number;
  idleThresholdSeconds: number;
}

/**
 * Retrieves and parses user preferences with fallback to defaults.
 * Converts string preferences to numbers and performs validation.
 *
 * @returns {ParsedPreferences} Parsed preference values with computed fields
 */
export function getParsedPreferences(): ParsedPreferences {
  const preferences = getPreferenceValues<Preferences>();

  const activeIntervalMinutes = Number.parseInt(preferences.activeInterval, 10) || DEFAULTS.ACTIVE_INTERVAL_MINUTES;
  const idleThresholdSeconds = Number.parseInt(preferences.idleThreshold, 10) || DEFAULTS.IDLE_THRESHOLD_SECONDS;

  return {
    activeIntervalSeconds: activeIntervalMinutes * 60,
    activeIntervalMinutes,
    idleThresholdSeconds,
  };
}
