import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    personalAccessTokens: preferencesMap.get("access-token"),
    gistId: preferencesMap.get("gist-id"),
    filename: preferencesMap.get("filename"),
  };
};

export const preference = commonPreferences();
