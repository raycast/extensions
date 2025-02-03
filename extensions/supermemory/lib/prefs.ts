import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apikey: string;
  autospace: boolean;
}

export function getPrefs(): Preferences {
  return getPreferenceValues();
}
