import { getPreferenceValues } from "@raycast/api";
import { AIProvider } from "./types";

export type Preferences = {
  openaiAccessToken: string;
  isHistoryPaused: boolean;
  aiProvider: AIProvider;
};

export function getAccessToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.openaiAccessToken;
}

export function getIsHistoryPaused(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.isHistoryPaused;
}

export function getAIProvider(): AIProvider {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.aiProvider ?? AIProvider.Auto;
}
