import { environment } from "@raycast/api";

export const TEAK_APP_URL = "https://app.teakvault.com";
const TEAK_DEV_APP_URL = "http://localhost:3000";

const DEV_CONVEX_SITE_URL = "https://reminiscent-kangaroo-59.convex.site";
const PROD_CONVEX_SITE_URL = "https://uncommon-ladybug-882.convex.site";

const normalizeUrl = (url: string): string =>
  url.endsWith("/") ? url.slice(0, -1) : url;

export const getConvexBaseUrl = (): string =>
  normalizeUrl(
    environment.isDevelopment ? DEV_CONVEX_SITE_URL : PROD_CONVEX_SITE_URL,
  );

export const TEAK_SETTINGS_URL = environment.isDevelopment
  ? `${TEAK_DEV_APP_URL}/settings`
  : `${TEAK_APP_URL}/settings`;
