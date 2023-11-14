import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  notesDirectory: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues() as Preferences;
}
