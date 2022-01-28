import { getPreferenceValues } from "@raycast/api";

export const preferences: Preferences = getPreferenceValues();

export interface Preferences {
  workspace: string;
  accountName: string;
  appPassword: string;
}
