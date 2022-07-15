import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiKey: string;
}

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}
