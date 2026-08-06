import { getPreferenceValues } from "@raycast/api";

export function getApiToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiToken ?? "";
}
