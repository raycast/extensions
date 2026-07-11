import { getPreferenceValues } from "@raycast/api";

export const preferences: Preferences = getPreferenceValues();

export interface Preferences {
  // apiKey is the same as a service account token
  // It is not renamed to `serviceAccountToken` to avoid breaking users' existing configurations
  apikey: string;
  rootApiUrl: string;
}
