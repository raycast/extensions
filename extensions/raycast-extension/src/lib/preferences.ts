import { getPreferenceValues } from "@raycast/api";

export interface ExtensionPreferences {
  apiKey: string;
  cliPath?: string;
  apiBaseUrl?: string;
  aiBaseUrl?: string;
}

export function readPreferences(): ExtensionPreferences {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return {
    apiKey: prefs.apiKey,
    cliPath: normalizeOptional(prefs.cliPath),
    apiBaseUrl: normalizeOptional(prefs.apiBaseUrl),
    aiBaseUrl: normalizeOptional(prefs.aiBaseUrl),
  };
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
