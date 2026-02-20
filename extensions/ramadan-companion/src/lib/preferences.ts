import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  city: string;
  country: string;
  method: string;
  school: string;
  timeFormat: "12h" | "24h";
  sehriSource: "fajr" | "imsak";
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
