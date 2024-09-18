import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiKey: string;
}

export const getPreferences = (): Preferences => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences;
};
