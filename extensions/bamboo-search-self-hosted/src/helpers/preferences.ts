import { getPreferenceValues } from "@raycast/api";

export const preferences: Preferences = getPreferenceValues();

export interface Preferences {
  host: string;
  authToken: string;
  sslVerify: boolean;
}
