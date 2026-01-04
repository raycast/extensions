import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiKey: string;
}

export function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  return apiKey;
}
