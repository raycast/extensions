import { environment } from "@raycast/api";

// The extension is zero-config for real users: it always talks to the hosted
// Gather instance over OAuth. There are intentionally NO user-facing
// preferences (an exposed "API Token" / "URL" field only confuses users and
// can't be hidden once declared).
//
// Dev testability is preserved via `environment.isDevelopment`, which is `true`
// only under `ray develop` and `false` in the published store build. So the
// DEV_* targets below are reachable while developing and are dead code for
// real users.

const PROD_BASE_URL = "https://gatherit.app";

// Dev-only — used ONLY under `ray develop`. The published build never reads
// these. To test the prod OAuth flow from dev instead of the local server, set
// DEV_BASE_URL to PROD_BASE_URL and DEV_API_TOKEN to `undefined`.
const DEV_BASE_URL = "http://localhost:3100";
// Matches MCP_DEV_BEARER_TOKEN on the local server. Not a secret — it only
// grants access to a localhost dev server that opted into this exact value.
const DEV_API_TOKEN: string | undefined = "local-dev-raycast-token";

/** Normalized Gather base URL (no trailing slash). */
export function getBaseUrl(): string {
  const base = environment.isDevelopment ? DEV_BASE_URL : PROD_BASE_URL;
  return base.replace(/\/+$/, "");
}

/**
 * Bearer token for `/api/v1`. In production this is always `undefined` so the
 * OAuth flow runs; in dev it's the local dev token so `ray develop` can hit the
 * local server without an OAuth round-trip.
 */
export function getApiToken(): string | undefined {
  return environment.isDevelopment ? DEV_API_TOKEN : undefined;
}
