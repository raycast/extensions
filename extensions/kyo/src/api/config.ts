import { getPreferenceValues } from "@raycast/api";

/**
 * All constants here are taken verbatim from the Kyo developer docs:
 *   - https://www.trykyo.com/docs/api    (REST API base URL + public anon key)
 *   - https://www.trykyo.com/docs/oauth  (authorize / token / revoke endpoints)
 *
 * The `apikey` value below is the *public* Supabase anon key that the Kyo web
 * app itself ships. Per the docs it "grants nothing by itself; all
 * authorization comes from the bearer token." It is only a routing key, so it
 * is safe to embed in a client-side extension.
 */

// REST API base — every path is relative to this.
export const API_BASE =
  "https://pvozbkuhjofzitsmpspf.supabase.co/functions/v1/api-v1/v1";

// OAuth 2.0 endpoints.
export const OAUTH_AUTHORIZE_URL = "https://app.trykyo.com/oauth/authorize";
export const OAUTH_TOKEN_URL =
  "https://pvozbkuhjofzitsmpspf.supabase.co/functions/v1/oauth-token";
export const OAUTH_REVOKE_URL =
  "https://pvozbkuhjofzitsmpspf.supabase.co/functions/v1/oauth-revoke";

// Public routing key ("apikey" header). Same value the Kyo web app publishes.
export const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2b3pia3Voam9meml0c21wc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzU0ODMsImV4cCI6MjA5MDYxMTQ4M30.PccqZEYqEHdG1dnFn1AtCcrBGSCqU5ptcP5Vxt-KhBY";

/**
 * The extension's first-party OAuth client, registered (verified, public/PKCE)
 * in Kyo alongside `kyo_cli` with Raycast's redirect URIs — the custom-scheme
 * ones (`raycast://oauth?package_name=Extension` and its beta/reverse-DNS
 * variants) plus the legacy `https://raycast.com/redirect` web bounce. Power
 * users can override it in preferences to point the extension at their own
 * registered app (Kyo Settings -> API, `kyoapp_…` ids).
 */
const DEFAULT_CLIENT_ID = "kyo_raycast";

export function getClientId(): string {
  const { clientId } = getPreferenceValues<{ clientId?: string }>();
  return clientId && clientId.trim().length > 0
    ? clientId.trim()
    : DEFAULT_CLIENT_ID;
}

/**
 * Default scopes requested at sign-in. Full read/write on everything the
 * extension touches, deliberately excluding the metered `enrich:write` scope
 * (enrichment spends workspace credits, so it stays opt-in — matching the CLI's
 * default grant).
 */
export const DEFAULT_SCOPES = [
  "deals:read",
  "deals:write",
  "people:read",
  "people:write",
  "companies:read",
  "companies:write",
  "tasks:read",
  "tasks:write",
  "pipelines:read",
  "pipelines:write",
  "labels:read",
  "labels:write",
  "comments:read",
  "comments:write",
  "spaces:read",
  "spaces:write",
  "activity:read",
  "credits:read",
].join(" ");
