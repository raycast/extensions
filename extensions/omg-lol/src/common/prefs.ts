import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
  username: string;
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
