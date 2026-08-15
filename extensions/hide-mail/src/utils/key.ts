import { getPreferenceValues } from "@raycast/api";

export const getApiKey = () => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.api_key;
};
