import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  fileExtension: string;
}

export const getPreferences = getPreferenceValues<Preferences>();
