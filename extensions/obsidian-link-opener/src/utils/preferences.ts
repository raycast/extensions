import { existsSync, readdirSync } from "fs";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

/**
 * Gets the user preferences from Raycast
 */
export function getPreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();

  // Set defaults if not provided
  return {
    urlProperties: preferences.urlProperties || ["url", "link", "website"],
    scanInterval: preferences.scanInterval || 60,
    useFrecency: preferences.useFrecency !== false, // Default to true
    cacheTTL: preferences.cacheTTL ? parseInt(String(preferences.cacheTTL)) : 5, // Default to 5 minutes
  };
}

export interface ObsidianPreferences {
  vaultPath: string | null;
  refreshInterval: number;
}

export const DEFAULT_PREFERENCES: ObsidianPreferences = {
  vaultPath: null,
  refreshInterval: 24, // Default refresh interval in hours
};

/**
 * Retrieves user preferences with validation and fallbacks to defaults
 */
export function getObsidianPreferences(): ObsidianPreferences {
  try {
    const prefs = getPreferenceValues<ObsidianPreferences>();
    return {
      vaultPath: prefs.vaultPath ?? DEFAULT_PREFERENCES.vaultPath,
      refreshInterval:
        prefs.refreshInterval || DEFAULT_PREFERENCES.refreshInterval,
    };
  } catch (error) {
    console.error("Error loading preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Validates that the provided path is a valid Obsidian vault
 * A valid vault should exist and contain markdown files
 */
export function isValidVaultPath(path: string | null): boolean {
  if (!path || !existsSync(path)) {
    return false;
  }

  try {
    // Check if directory contains markdown files
    const files = readdirSync(path);
    return files.some((file) => file.endsWith(".md"));
  } catch (error) {
    console.error("Error validating vault path:", error);
    return false;
  }
}

/**
 * Validates the refresh interval is within acceptable bounds
 */
export function isValidRefreshInterval(interval: number): boolean {
  return interval >= 1 && interval <= 168; // Between 1 hour and 1 week
}
