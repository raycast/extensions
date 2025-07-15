import { getPreferenceValues } from "@raycast/api";
import { ApiConfig } from "../../types";

export function getApiConfig(): ApiConfig {
  const preferences = getPreferenceValues<Preferences>();

  // Ensure we're getting string values, not objects
  const config = {
    apiKey: String(preferences.cloudflareApiKey || ""),
    zoneId: String(preferences.cloudflareZoneId || ""),
    destinationEmail: String(preferences.destinationEmail || ""),
    preAllocatePool: Boolean(preferences.preAllocatePool),
  };

  return config;
}
