import { environment } from "@raycast/api";

const DEFAULT_TEAK_DEV_APP_URL = "http://app.teak.localhost:1355";
const DEFAULT_TEAK_DEV_API_URL = "http://api.teak.localhost:1355";

const normalizeBaseUrl = (label: string, rawUrl: string): string => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid ${label}`);
  }
  parsedUrl.pathname = "";
  parsedUrl.search = "";
  parsedUrl.hash = "";
  return parsedUrl.toString().replace(/\/$/, "");
};

const resolveDevUrl = (
  envValue: unknown,
  fallback: string,
  label: string,
): string => {
  const resolved = typeof envValue === "string" ? envValue.trim() : "";
  return normalizeBaseUrl(label, resolved || fallback);
};

export const TEAK_APP_URL = "https://app.teakvault.com";
export const TEAK_DEV_APP_URL = resolveDevUrl(
  process.env.TEAK_DEV_APP_URL,
  DEFAULT_TEAK_DEV_APP_URL,
  "TEAK_DEV_APP_URL",
);
const DEV_API_URL = `${resolveDevUrl(
  process.env.TEAK_DEV_API_URL,
  DEFAULT_TEAK_DEV_API_URL,
  "TEAK_DEV_API_URL",
)}/v1`;
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
