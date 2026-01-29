import { getPreferenceValues } from "@raycast/api";

export interface PortPreferences {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export function getPortPreferences(): PortPreferences {
  return getPreferenceValues<PortPreferences>();
}

export function getBaseUrl(): string {
  const { baseUrl } = getPortPreferences();
  return baseUrl || "https://api.getport.io";
}
