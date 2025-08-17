/**
 * Centralized constants for the iOS Apps extension
 */

// App Store URLs
export const APP_STORE_BASE_URL = "https://apps.apple.com";
export const APP_STORE_APP_URL_TEMPLATE = `${APP_STORE_BASE_URL}/app/id`;

// iTunes API URLs
export const ITUNES_API_BASE_URL = "https://itunes.apple.com";
export const ITUNES_SEARCH_ENDPOINT = "/search";
export const ITUNES_LOOKUP_ENDPOINT = "/lookup";

/**
 * Generate App Store URL for an app by ID
 * @param appId - The app ID
 * @returns Complete App Store URL
 */
export function getAppStoreUrl(appId: string | number): string {
  const url = new URL(`${APP_STORE_APP_URL_TEMPLATE}${appId}`);
  return url.toString();
}
