import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export const getAPIKey = () => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey;
};
