import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  instanceUrl: string;
  apiToken: string;
  username: string;
  cloneUrlTemplate: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
