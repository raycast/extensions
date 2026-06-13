import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  wallpaperEnginePath?: string;
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
