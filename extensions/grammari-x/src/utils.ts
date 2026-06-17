import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  openaiAccessToken: string;
  isHistoryPaused: boolean;
};

export function getAccessToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.openaiAccessToken;
}

export function getIsHistoryPaused(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.isHistoryPaused;
}
