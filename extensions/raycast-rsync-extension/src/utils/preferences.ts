import { getPreferenceValues } from "@raycast/api";
import { RsyncOptions } from "../types/server";

/**
 * Preferences interface matching package.json preferences
 */
export interface RsyncPreferences {
  rsyncHumanReadable: boolean;
  rsyncProgress: boolean;
  rsyncDelete: boolean;
}

/**
 * Get rsync preferences from Raycast preferences
 * @returns RsyncOptions object derived from preferences
 */
export function getRsyncPreferences(): RsyncOptions {
  const preferences = getPreferenceValues<RsyncPreferences>();
  return {
    humanReadable: preferences.rsyncHumanReadable,
    progress: preferences.rsyncProgress,
    delete: preferences.rsyncDelete,
  };
}
