import { getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";

export function getBooxPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getDownloadDirectory(
  preferences: Pick<Preferences, "downloadDirectory"> = getBooxPreferences()
): string {
  return preferences.downloadDirectory || path.join(os.homedir(), "Downloads", "BOOX");
}
