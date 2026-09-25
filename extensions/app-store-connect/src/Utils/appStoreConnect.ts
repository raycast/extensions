/**
 * Every App Store Connect and Apple Developer URL the extension links to.
 *
 * One place, because these move: Apple relocated API keys from `/access/api` to
 * `/access/integrations/api`, and a URL duplicated across five files gets fixed in four
 * of them. The API base for requests lives in Hooks/useAppStoreConnect, not here — that
 * is an endpoint, not a page a person opens.
 */

const APP_STORE_CONNECT = "https://appstoreconnect.apple.com";

/** Both key types are listed here; Team Keys and Individual Keys are tabs on the page. */
export const API_KEYS_URL = `${APP_STORE_CONNECT}/access/integrations/api`;

/** Where team members are invited and managed, and where team keys are created. */
export const USERS_AND_ACCESS_URL = `${APP_STORE_CONNECT}/access/users`;

/** Apple's explanation of what an API key is and how to create one. */
export const CREATING_API_KEYS_DOCS_URL =
  "https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api";

/** An app's page in App Store Connect. */
export function appUrl(appId: string) {
  return `${APP_STORE_CONNECT}/apps/${appId}`;
}

/** An app's TestFlight page. Platform is part of the path; iOS covers iPadOS too. */
export function testFlightUrl(appId: string, platform = "ios") {
  return `${appUrl(appId)}/testflight/${platform}`;
}
