import { getPreferenceValues } from "@raycast/api";

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};

export const getSearchPreferences = (): Preferences.Search => {
  return getPreferenceValues<Preferences.Search>();
};
