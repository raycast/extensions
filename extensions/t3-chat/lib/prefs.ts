import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  model: string;
}

export function getPrefs(): Preferences {
  return getPreferenceValues();
}
