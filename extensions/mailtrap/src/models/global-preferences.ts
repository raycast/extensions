import { getPreferenceValues } from "@raycast/api";

export interface GlobalPreferences {
  apiKey: string;
  accountId: string;
}

export function areGlobalPreferencesValid() {
  const preferences = getPreferenceValues<GlobalPreferences>();

  if (!preferences.apiKey) return false;
  if (!preferences.accountId) return false;

  return true;
}
