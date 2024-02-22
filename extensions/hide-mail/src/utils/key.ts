import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  api_key: string;
}

export const getApiKey = () => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.api_key;
};
