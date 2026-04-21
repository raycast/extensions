import { environment } from "@raycast/api";

export const TEAK_APP_URL = "https://app.teakvault.com";
const TEAK_DEV_APP_URL = "http://localhost:3000";

const DEV_API_URL = "http://127.0.0.1:8787/v1";
const PROD_API_URL = "https://api.teakvault.com/v1";

const normalizeUrl = (url: string): string =>
  url.endsWith("/") ? url.slice(0, -1) : url;

export const getApiBaseUrl = (): string =>
  normalizeUrl(environment.isDevelopment ? DEV_API_URL : PROD_API_URL);

export const TEAK_SETTINGS_URL = environment.isDevelopment
  ? `${TEAK_DEV_APP_URL}/settings`
  : `${TEAK_APP_URL}/settings`;
