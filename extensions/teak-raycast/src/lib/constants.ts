import { environment } from "@raycast/api";

const DEFAULT_TEAK_DEV_APP_URL = "http://app.teak.localhost:1355";
// HTTPS so the token-authenticated card API calls reach portless directly.
// Over http, portless 302-upgrades to https and undici drops the Authorization
// header across the scheme change (cross-origin redirect), so the gateway 401s.
// undici trusts the portless cert (verified: the redirected https request
// returns a real 401 rather than a TLS error), so hitting https up front is safe.
const DEFAULT_TEAK_DEV_API_URL = "https://api.teak.localhost:1355";
// Dev Convex deployment that `convex dev` targets and where the OAuth server
// (Better Auth `mcp` plugin) and its seeded clients live. The token exchange
// must reach THIS deployment — see getOAuthTokenBaseUrl. Overridable via
// TEAK_DEV_CONVEX_SITE_URL. NOTE: this must match the deployment the web app's
// authorize step proxies to (i.e. the running `convex dev` deployment), NOT
// necessarily the NEXT_PUBLIC_CONVEX_SITE_URL baked into a Vercel-pulled
// `.env.local`, which can point at a different/stale deployment.
const DEFAULT_TEAK_DEV_CONVEX_SITE_URL =
  "https://reminiscent-kangaroo-59.convex.site";

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

// App (web) origin that hosts the OAuth authorize endpoint
// (`/api/auth/mcp/authorize`). The browser sign-in step must run here so the
// session cookie is read on the web domain.
export const getAppBaseUrl = (): string =>
  normalizeUrl(environment.isDevelopment ? TEAK_DEV_APP_URL : TEAK_APP_URL);

const readEnvUrl = (value: unknown): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
};

// Dev Convex site origin. Prefers an explicit TEAK_DEV_CONVEX_SITE_URL override,
// otherwise the canonical dev deployment default. We intentionally do NOT read
// NEXT_PUBLIC_CONVEX_SITE_URL here: a Vercel-pulled `.env.local` can point it at
// a different/stale deployment than the one `convex dev` deploys to, and env
// vars are not guaranteed to reach the Raycast extension sandbox anyway.
const resolveDevConvexSiteUrl = (): string => {
  const override = readEnvUrl(process.env.TEAK_DEV_CONVEX_SITE_URL);
  return normalizeBaseUrl(
    "TEAK_DEV_CONVEX_SITE_URL",
    override ?? DEFAULT_TEAK_DEV_CONVEX_SITE_URL,
  );
};

// Base origin for the OAuth token exchange (POST `/api/auth/mcp/token`).
//
// The token POST must reach Better Auth without crossing a redirecting proxy.
// In local dev, portless upgrades http -> https with a 302 that Raycast's token
// fetch (undici, default redirect: "follow") replays as a GET, so the POST 404s
// and sign-in bounces back. Convex's own site origin serves the same endpoint
// over publicly-trusted HTTPS with no redirect, so we hit it directly in dev.
// In production the app origin already serves the token endpoint without any
// redirect, so it stays there.
export const getOAuthTokenBaseUrl = (): string =>
  environment.isDevelopment ? resolveDevConvexSiteUrl() : TEAK_APP_URL;

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
