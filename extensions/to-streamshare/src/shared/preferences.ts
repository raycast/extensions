import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  copyUrlToClipboard: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
