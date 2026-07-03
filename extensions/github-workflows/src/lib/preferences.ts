import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  rootFolder: string;
  githubToken: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
