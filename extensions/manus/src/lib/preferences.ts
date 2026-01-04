import { getPreferenceValues } from "@raycast/api";

export function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  return apiKey;
}
