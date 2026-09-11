import { getPreferenceValues } from "@raycast/api";

export function getPageSize(): number {
  const prefs = getPreferenceValues<Preferences>();
  const raw = parseInt(prefs.defaultPageSize ?? "24", 10);
  if (isNaN(raw) || raw < 1) return 24;
  return Math.min(raw, 100);
}

export function getDefaultSort(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.defaultSearchSort ?? "score_desc";
}
