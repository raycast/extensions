import { getPreferenceValues } from "@raycast/api";

export interface TimistPreferences {
  apiKey: string;
  baseUrl?: string;
}

export function preferences(): TimistPreferences {
  return getPreferenceValues<TimistPreferences>();
}
