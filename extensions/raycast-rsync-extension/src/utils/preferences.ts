import { getPreferenceValues } from "@raycast/api";
import { RsyncOptions } from "../types/server";

/**
 * Get rsync preferences from Raycast preferences.
 * Uses the auto-generated Preferences type from raycast-env.d.ts.
 * @returns RsyncOptions object derived from preferences
 */
export function getRsyncPreferences(): RsyncOptions {
  const preferences = getPreferenceValues<Preferences>();
  return {
    humanReadable: preferences.rsyncHumanReadable,
    progress: preferences.rsyncProgress,
    delete: preferences.rsyncDelete,
  };
}
