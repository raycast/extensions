import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain: string;
  clientId: string;
  additionalObjects?: string;
}

export const prefs = getPreferenceValues() as Preferences;
