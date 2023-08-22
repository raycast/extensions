import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  openaiAccessToken: string;
};

export function getAccessToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.openaiAccessToken;
}
