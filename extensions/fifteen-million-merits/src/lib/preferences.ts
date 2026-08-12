import { getPreferenceValues } from "@raycast/api";

/**
 * Parses and validates the distraction threshold preference value.
 */
function parseDistractionThreshold(value: string | undefined): number {
  if (!value) return 0;

  const parsed = parseInt(value, 10);

  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Retrieves the current distraction threshold from user preferences.
 */
export function getDistractionThreshold(): number {
  const { distractionThreshold } = getPreferenceValues<Preferences>();

  return parseDistractionThreshold(distractionThreshold);
}
