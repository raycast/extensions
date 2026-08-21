import { getPreferenceValues } from "@raycast/api";

export interface ExtensionPreferences {
  baseUrl: string;
  webAppUrl: string;
}

export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getApiBaseUrl(): string {
  return getPreferences().baseUrl.replace(/\/+$/, "");
}

export function getWebAppUrl(): string {
  return getPreferences().webAppUrl.replace(/\/+$/, "");
}

export function ticketWebUrl(ticketId: string): string {
  return `${getWebAppUrl()}/dashboard/ticketing/tickets/${ticketId}`;
}
