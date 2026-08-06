import { OAuth } from "@raycast/api";

// iOS-type Google OAuth client (bundle ID "com.raycast"), per Raycast's docs.
// Pure PKCE: this client type has NO client secret at all, so nothing secret
// ships in this public repo. Replaced the Web-type client + gitignored
// secrets.ts on 2026-07-02 — CI builds from committed source and couldn't
// resolve the ignored file (decisions.md 2026-07-02).
const CLIENT_ID = "647157801043-so41v8vj13es4sfd4n6jrh46uav5rrgu.apps.googleusercontent.com";
// Two narrow read-only scopes, not the broad calendar.readonly (E.0 scope
// minimization, 2026-06-02): list calendars (to find/pick the calendar) + read
// events (to poll them). The watcher's steady state only needs events.readonly;
// calendarlist.readonly is for the calendar resolve/picker (dev bootstrap + D.5).
const SCOPE =
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly " +
  "https://www.googleapis.com/auth/calendar.events.readonly";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const client = new OAuth.PKCEClient({
  // AppURI = the com.raycast:/oauth… app-link redirect, the pairing Google's
  // iOS client type expects (Raycast docs + the shipped Gmail extension).
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google Calendar",
  providerIcon: "extension-icon.png",
  providerId: "google-calendar",
  description: "Authorize Raycast to read your Google Calendars and events.",
});

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

// Google's token endpoint returns { error, error_description, ... } on failure.
// The `error` field is a documented enum (invalid_grant, invalid_client, …) — no
// PII or secrets. The body at large (error_description, etc.) can carry detail we
// don't want in focus.log, where the watcher's catch writes these errors. So we
// surface ONLY the enum: it keeps the `invalid_grant` signal the watcher's
// re-auth routing keys on (focus-watcher.tsx) while dropping the rest. This is
// why Q4 parses the body rather than going status-only like gcal.ts Q3 — gcal
// routes on the 401 status, oauth routes on this enum. (E.0 Q4, 2026-06-24.)
function tokenErrorCode(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (parsed && typeof parsed.error === "string") return parsed.error;
  } catch {
    // body wasn't JSON — fall through to the safe fallback
  }
  return "unknown_error";
}

// Headless token path for the background watcher (Phase C2).
//
// A background command has no UI, so it must NEVER hit the interactive browser
// flow below. This returns a valid access token by reading stored tokens and
// silently refreshing if expired, or null if the user has never authorized
// (i.e. hasn't completed onboarding yet). The caller skips the poll on null.
//
// The refresh uses a raw fetch to Google's token endpoint (no UI), so it works
// from a background process. Resolves arch open item #3.
export async function getAccessTokenSilently(): Promise<string | null> {
  const existing = await client.getTokens();
  if (!existing?.accessToken) return null;
  if (existing.refreshToken && existing.isExpired()) {
    const refreshed = await refreshTokens(existing.refreshToken);
    await client.setTokens(refreshed);
    return refreshed.access_token;
  }
  return existing.accessToken;
}

// Clears the stored token set (same effect as Raycast's built-in Log Out). Used
// by the D.5 dev-only "Reset onboarding" action to simulate a brand-new user.
export async function disconnect(): Promise<void> {
  await client.removeTokens();
}

export async function authorize(): Promise<string> {
  const existing = await client.getTokens();

  // Reuse a still-valid token; refresh it if we have a refresh token.
  if (existing?.accessToken && !existing.isExpired()) {
    return existing.accessToken;
  }
  if (existing?.refreshToken) {
    try {
      const refreshed = await refreshTokens(existing.refreshToken);
      await client.setTokens(refreshed);
      return refreshed.access_token;
    } catch {
      // Refresh failed (revoked/scope change) — fall through to re-consent.
    }
  }

  // No usable token. Clear any stale one so the consent flow starts clean and
  // the requested scopes take effect, then re-consent.
  if (existing) await client.removeTokens();

  const authRequest = await client.authorizationRequest({
    endpoint: AUTH_ENDPOINT,
    clientId: CLIENT_ID,
    scope: SCOPE,
    // No extraParameters: installed-app (iOS-type) clients always receive a
    // refresh token with PKCE, so the background watcher can renew silently.
    // The old Web-client-only access_type=offline + prompt=consent (C2.b fix)
    // went away with the client switch — same shape as Raycast's own Google
    // example and the shipped Gmail extension.
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(authRequest, authorizationCode);
  await client.setTokens(tokens);
  return tokens.access_token;
}

async function exchangeCode(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<GoogleTokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    const code = tokenErrorCode(await response.text());
    throw new Error(`Token exchange failed: ${response.status} ${code}`);
  }
  return (await response.json()) as GoogleTokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<GoogleTokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    const code = tokenErrorCode(await response.text());
    throw new Error(`Token refresh failed: ${response.status} ${code}`);
  }
  const json = (await response.json()) as GoogleTokenResponse;
  return { ...json, refresh_token: json.refresh_token ?? refreshToken };
}
