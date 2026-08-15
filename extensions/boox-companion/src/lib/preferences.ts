import { getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";

export interface BooxPreferences {
  manualHost?: string;
  password?: string;
  quickSendDirectory: string;
  downloadDirectory?: string;
  scanVirtualInterfaces?: boolean;
}

export function getBooxPreferences(): BooxPreferences {
  return getPreferenceValues<BooxPreferences>();
}

export function getDownloadDirectory(preferences = getBooxPreferences()): string {
  return preferences.downloadDirectory || path.join(os.homedir(), "Downloads", "BOOX");
}
