import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  targetAppleScriptApplication: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
