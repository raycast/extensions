import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  searchResultLimitStr: string;
}

export const raycastPreferences: Preferences = getPreferenceValues();
