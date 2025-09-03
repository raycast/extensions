import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  baseSiteUrl: string;
}

export function getBaseSiteUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.baseSiteUrl || "https://flibusta.is";
}
