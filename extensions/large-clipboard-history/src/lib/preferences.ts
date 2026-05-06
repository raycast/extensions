import { getPreferenceValues } from "@raycast/api";

const DEFAULT_MAX_ENTRIES = 500;

export function getMaxEntries() {
  const raw = getPreferenceValues<Preferences>().maxEntries;
  if (!raw) return DEFAULT_MAX_ENTRIES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MAX_ENTRIES;
  return parsed;
}
