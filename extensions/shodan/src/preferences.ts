// src/preferences.ts
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export const getApiKey = (): string => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey;
};
