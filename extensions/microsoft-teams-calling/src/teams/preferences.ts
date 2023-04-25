import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiToken: string;
}

export const prefs = getPreferenceValues<Preferences>();
