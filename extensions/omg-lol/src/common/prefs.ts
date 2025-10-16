import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  username?: string;
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
