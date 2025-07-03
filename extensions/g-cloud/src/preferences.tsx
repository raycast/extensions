import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  gcloudPath: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
