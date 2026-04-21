import { getPreferenceValues } from "@raycast/api";

export function getUserPreferences() {
  const userPreferences = getPreferenceValues<Preferences>();
  const gap = parseInt(userPreferences.gap as string, 10);
  const rawExcluded = (userPreferences.excludedApps as string) ?? "";

  return {
    gap: Number.isNaN(gap) ? 0 : gap,
    disableToasts: Boolean(userPreferences.disableToasts),
    keepWindowOpenAfterTiling: Boolean(userPreferences.keepWindowOpenAfterTiling),
    excludedApps: rawExcluded
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}
