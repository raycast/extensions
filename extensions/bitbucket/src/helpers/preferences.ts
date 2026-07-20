import { getPreferenceValues } from "@raycast/api";

export const preferences: Preferences = getPreferenceValues();

export interface Preferences {
  workspace: string;
  email: string;
  apiToken: string;
}
