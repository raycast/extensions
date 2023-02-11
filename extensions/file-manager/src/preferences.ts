import { getPreferenceValues } from "@raycast/api";

export type ExtPreferencesType = {
  showDots: boolean;
  directoriesFirst: boolean;
  caseSensitive: boolean;
  showFilePermissions: boolean;
  showFileSize: boolean;
  startDirectory: string;
};

export function getExtPreferences(): ExtPreferencesType {
  return getPreferenceValues();
}
