import { getPreferenceValues } from "@raycast/api";

export function getBaseSiteUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.baseSiteUrl || "https://flibusta.is";
}
