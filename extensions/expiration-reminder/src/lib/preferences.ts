import { getPreferenceValues } from "@raycast/api";

export interface ExtensionPreferences {
  defaultExpiryWindow: string;
  pageSize: string;
  telemetryEnabled: boolean;
}

/**
 * The API and web hosts are fixed first-party endpoints, not user preferences.
 * They are already normalized (no trailing slash) so path segments concatenate
 * cleanly.
 */
export const API_BASE_URL = "https://api.expirationreminder.com";
export const WEB_BASE_URL = "https://app.expirationreminder.com";

export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getWebBaseUrl(): string {
  return WEB_BASE_URL;
}

/** Default "expiring soon" window in days, from preferences. */
export function getDefaultExpiryWindow(): number {
  const { defaultExpiryWindow } = getPreferences();
  const parsed = parseInt(defaultExpiryWindow, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

/** Requested page size for list commands (server cap is 500). */
export function getPageSize(): number {
  const { pageSize } = getPreferences();
  const parsed = parseInt(pageSize, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(parsed, 500);
}
