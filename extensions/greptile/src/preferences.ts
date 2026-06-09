import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  apiKey?: string;
  includeAddressed?: boolean;
};

export function getGreptileApiKey() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;

  if (!apiKey) {
    throw new Error("Missing Greptile API key. Set it in Raycast preferences.");
  }

  return apiKey;
}

export function getSearchCommentPreferences() {
  return getPreferenceValues<Preferences>();
}
