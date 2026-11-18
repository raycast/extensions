import { getPreferenceValues } from "@raycast/api";
import { apiBase, gatewayOrigin } from "./url";

export function getPrefs(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  return {
    baseUrl: preferences.baseUrl || "https://api.everyapi.ai/v1",
  };
}

export function getAdminApiBase(): string {
  return apiBase(gatewayOrigin(getPrefs().baseUrl));
}
