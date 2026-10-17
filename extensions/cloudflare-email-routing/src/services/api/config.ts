import { getPreferenceValues } from "@raycast/api";
import { ApiConfig } from "../../types";

export function getApiConfig(): ApiConfig {
  const preferences = getPreferenceValues<Preferences>();

  const config = {
    apiKey: preferences.cloudflareApiKey,
    zoneId: preferences.cloudflareZoneId,
    destinationEmail: preferences.destinationEmail,
    preAllocatePool: preferences.preAllocatePool,
    aliasPreface: preferences.aliasPreface?.trim() || undefined,
    defaultLabel: preferences.defaultLabel?.trim() || undefined,
  };

  return config;
}
