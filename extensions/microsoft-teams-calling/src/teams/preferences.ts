import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiToken: string;
  apiVersion: string;
}

export const prefs = getPreferenceValues<Preferences>();
