import { getPreferenceValues } from "@raycast/api";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
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
