import { environment } from "@raycast/api";
import {
  resolveTeakDevApiUrl,
  resolveTeakDevAppUrl,
} from "@teak/convex/dev-urls";

export const TEAK_APP_URL = "https://app.teakvault.com";
export const TEAK_DEV_APP_URL = resolveTeakDevAppUrl(process.env);
const DEV_API_URL = `${resolveTeakDevApiUrl(process.env)}/v1`;
const PROD_API_URL = "https://api.teakvault.com/v1";

const normalizeUrl = (url: string): string =>
  url.endsWith("/") ? url.slice(0, -1) : url;

export const getApiBaseUrl = (): string =>
  normalizeUrl(environment.isDevelopment ? DEV_API_URL : PROD_API_URL);

export const TEAK_SETTINGS_URL = environment.isDevelopment
  ? `${TEAK_DEV_APP_URL}/settings`
  : `${TEAK_APP_URL}/settings`;

export const getTeakCardUrl = (cardId: string): string => {
  const url = new URL(
    environment.isDevelopment ? TEAK_DEV_APP_URL : TEAK_APP_URL,
  );
  url.searchParams.set("card", cardId);
  return url.toString();
};
