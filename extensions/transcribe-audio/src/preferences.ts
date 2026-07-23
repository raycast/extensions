import { getPreferenceValues } from "@raycast/api";
import { Provider } from "./types";

export interface Preferences {
  openaiApiKey?: string;
  deepgramApiKey?: string;
  elevenlabsApiKey?: string;
  defaultProvider: Provider;
  defaultAudioType: string;
  language?: string;
  historyEnabled?: boolean;
  historyRetentionDays?: string;
  historyMaxEntries?: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getApiKey(provider: Provider, prefs: Preferences): string {
  const key = prefs[`${provider}ApiKey` as keyof Preferences];
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    throw new Error(`No API key set for ${provider}. Add it in the command preferences.`);
  }
  return key.trim();
}

export function hasApiKey(provider: Provider, prefs: Preferences): boolean {
  const key = prefs[`${provider}ApiKey` as keyof Preferences];
  return typeof key === "string" && key.trim().length > 0;
}
