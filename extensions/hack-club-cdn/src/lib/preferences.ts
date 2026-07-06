import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiToken: string;
}

export function getApiToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiToken;
}
