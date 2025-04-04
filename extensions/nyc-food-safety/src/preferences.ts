import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  openaiApiKey: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
