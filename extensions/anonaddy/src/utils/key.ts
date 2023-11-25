import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export const getApiKey = () => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey;
};
