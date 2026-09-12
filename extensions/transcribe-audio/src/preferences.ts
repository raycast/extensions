import { getPreferenceValues } from "@raycast/api";
import { Provider } from "./types";

export type ExtensionPreferences = Preferences;
export type TranscribeCommandPreferences = Preferences.Transcribe;
export type HistoryCommandPreferences = Preferences.History;

export function getExtensionPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getTranscribePreferences(): TranscribeCommandPreferences {
  return getPreferenceValues<TranscribeCommandPreferences>();
}

export function getHistoryPreferences(): HistoryCommandPreferences {
  return getPreferenceValues<HistoryCommandPreferences>();
}

export function getApiKey(provider: Provider, prefs: { [key: string]: unknown }): string {
  const key = prefs[`${provider}ApiKey`];
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new Error(`No API key set for ${provider}. Add it in the command preferences.`);
  }
  return key.trim();
}

export function hasApiKey(provider: Provider, prefs: { [key: string]: unknown }): boolean {
  const key = prefs[`${provider}ApiKey`];
  return typeof key === "string" && key.trim().length > 0;
}
