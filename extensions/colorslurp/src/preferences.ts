import { getPreferenceValues } from "@raycast/api";

interface RecentColorsCommandPreferences {
  primaryAction: "copy" | "paste";
}

export const recentColorsCommandPreferences = getPreferenceValues<RecentColorsCommandPreferences>();
