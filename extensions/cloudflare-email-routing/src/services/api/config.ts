import { getPreferenceValues } from "@raycast/api";
import { ApiConfig } from "../../types";

export function getApiConfig(): ApiConfig {
  const preferences = getPreferenceValues<Preferences>();

  const config = {
    apiKey: preferences.cloudflareApiKey,
    zoneId: preferences.cloudflareZoneId,
    destinationEmail: preferences.destinationEmail,
    preAllocatePool: preferences.preAllocatePool,
  };

  return config;
}
