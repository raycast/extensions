import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  extension: string;
}

export const getPreferences = getPreferenceValues<Preferences>();
