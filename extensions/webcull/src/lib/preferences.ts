import { environment, getPreferenceValues } from "@raycast/api";

const PRODUCTION_API_BASE_URL = "https://xapi.webcull.com";
const PRODUCTION_APP_BASE_URL = "https://app.webcull.com";

export type WebCullPreferences = {
  apiBaseUrl: string;
  appBaseUrl: string;
};

export function getWebCullPreferences(): WebCullPreferences {
  const preferences = getPreferenceValues<Partial<WebCullPreferences>>();
  const defaults = getDefaultWebCullUrls();

  return {
    apiBaseUrl: trimTrailingSlash(preferences.apiBaseUrl || defaults.apiBaseUrl),
    appBaseUrl: trimTrailingSlash(preferences.appBaseUrl || defaults.appBaseUrl),
  };
}

function getDefaultWebCullUrls(): WebCullPreferences {
  if (environment.isDevelopment) {
    return {
      apiBaseUrl: process.env.WEBCULL_DEV_API_BASE_URL || PRODUCTION_API_BASE_URL,
      appBaseUrl: process.env.WEBCULL_DEV_APP_BASE_URL || PRODUCTION_APP_BASE_URL,
    };
  }

  return {
    apiBaseUrl: PRODUCTION_API_BASE_URL,
    appBaseUrl: PRODUCTION_APP_BASE_URL,
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
