import { getPreferenceValues } from "@raycast/api";

export interface ExtensionPreferences {
  gamPath?: string;
  domains?: string;
}

/**
 * Returns an array of domains configured in Raycast preferences.
 */
export function getConfiguredDomains(): string[] {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (!preferences.domains?.trim()) {
    return [];
  }

  return preferences.domains
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}
