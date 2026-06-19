import { getPreferenceValues } from "@raycast/api";

const DEFAULT_PROBE_COUNT = 5;

/**
 * Reads the global probe count preference and falls back to the extension default when invalid.
 */
export function getProbeLimitPreference(): number {
  const { probeCount } = getPreferenceValues<Preferences>();
  const parsed = Number.parseInt(probeCount ?? String(DEFAULT_PROBE_COUNT), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PROBE_COUNT;
  }

  return parsed;
}
