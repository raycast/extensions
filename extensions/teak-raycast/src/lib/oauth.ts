import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import {
  getApiBaseUrl,
  getAppBaseUrl,
  getOAuthTokenBaseUrl,
} from "./constants";

// Teak's authorization server (Better Auth `mcp` plugin) exposes the OAuth
// endpoints on the web origin. `teak-raycast` is registered server-side as a
// trusted public client (PKCE, no secret), so the browser sign-in flow needs no
// manual key entry. OAuthService handles token storage and automatic refresh.
//
// `authorize` runs in the browser and must hit the web origin so the session
// cookie authenticates the request. The `token`/refresh exchange is a
// server-to-server POST that only needs to reach Better Auth, so it targets the
// token base URL directly with no redirect in between (see
// getOAuthTokenBaseUrl).
const authorizeUrl = `${getAppBaseUrl()}/api/auth/mcp/authorize`;
const tokenUrl = `${getOAuthTokenBaseUrl()}/api/auth/mcp/token`;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Teak",
  providerId: "teak",
  providerIcon: "icon.png",
  description: "Connect your Teak account to save and search cards.",
});

export const teakOAuth = new OAuthService({
  client,
  clientId: "teak-raycast",
  scope: "profile email offline_access",
  authorizeUrl,
  tokenUrl,
  refreshTokenUrl: tokenUrl,
  // OAuth 2.1 token endpoint expects form-encoded bodies.
  bodyEncoding: "url-encoded",
});

// Dedupe concurrent authorize() calls. Raycast dev mode can invoke effects
// twice (strict-mode style); without this, two authorization requests would be
// started with two different `state` values, and the browser callback for the
// first would fail Raycast's state check against the second ("OAuth state
// mismatch"). All callers share a single in-flight authorization (one `state`).
let inFlightAuthorize: Promise<string> | null = null;
let inFlightStoredToken: Promise<string | null> | null = null;
let inFlightSignOut: Promise<void> | null = null;

export function authorizeTeak(): Promise<string> {
  if (inFlightSignOut) {
    return Promise.reject(
      new Error("Teak sign-out is in progress. Try again."),
    );
  }
  if (!inFlightAuthorize) {
    inFlightAuthorize = teakOAuth.authorize().finally(() => {
      inFlightAuthorize = null;
    });
  }
  return inFlightAuthorize;
}

// Force a brand-new authorization: drop stored tokens and any in-flight guard,
// then re-authorize. Used after a 401 when the current token is rejected.
export async function reauthorizeTeak(): Promise<string> {
  if (inFlightSignOut) {
    throw new Error("Teak sign-out is in progress. Try again.");
  }
  await teakOAuth.client.removeTokens();
  inFlightAuthorize = null;
  return authorizeTeak();
}

export function signOutTeak(): Promise<void> {
  if (!inFlightSignOut) {
    inFlightSignOut = revokeStoredSession().finally(() => {
      inFlightSignOut = null;
    });
  }
  return inFlightSignOut;
}

async function revokeStoredSession(): Promise<void> {
  // A refresh may rotate both credentials. Revoke its final stored result,
  // and prevent new authorizations from restoring tokens after sign-out.
  await Promise.allSettled([inFlightAuthorize, inFlightStoredToken]);
  const tokenSet = await teakOAuth.client.getTokens();
  const token = tokenSet?.refreshToken || tokenSet?.accessToken;
  if (token) {
    try {
      const response = await fetch(
        `${getApiBaseUrl().replace(/\/v1$/, "")}/api/oauth/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: "teak-raycast",
            token,
          }).toString(),
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) {
        throw new Error("Revocation failed");
      }
    } catch {
      throw new Error(
        "Your credentials are still saved. Check your connection and try Sign Out again.",
      );
    }
  }
  await teakOAuth.client.removeTokens();
}

// Non-interactive check for an existing stored session. Unlike authorizeTeak(),
// this NEVER opens the browser sign-in overlay — it only reports whether we
// already hold a usable (or refreshable) token. Used to gate views so merely
// opening a command does not trigger sign-in as a side effect; the visible
// "Sign in with Browser" action remains the explicit entry point.
export async function hasStoredTeakSession(): Promise<boolean> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    return false;
  }
  // A non-expired access token is usable as-is; an expired one is still fine
  // when a refresh token exists, since the request path refreshes on demand.
  return !tokenSet.isExpired() || Boolean(tokenSet.refreshToken);
}

// Resolve a usable access token WITHOUT ever launching the interactive sign-in
// overlay. When the stored access token is expired, attempt a silent refresh
// with the stored refresh token. Returns null when there is no stored token or
// the refresh fails (stale/revoked) — callers then prompt the user to sign in
// explicitly rather than popping the browser overlay from a background command.
export function getStoredTeakAccessToken(): Promise<string | null> {
  if (inFlightSignOut) {
    return Promise.resolve(null);
  }
  if (!inFlightStoredToken) {
    inFlightStoredToken = resolveStoredTeakAccessToken().finally(() => {
      inFlightStoredToken = null;
    });
  }
  return inFlightStoredToken;
}

async function resolveStoredTeakAccessToken(): Promise<string | null> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    return null;
  }
  if (!tokenSet.isExpired()) {
    return tokenSet.accessToken;
  }
  if (!tokenSet.refreshToken) {
    return null;
  }

  try {
    const body = new URLSearchParams({
      client_id: teakOAuth.clientId,
      grant_type: "refresh_token",
      refresh_token: tokenSet.refreshToken,
    });
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return null;
    }
    const parsed = (await response.json()) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
    };
    if (typeof parsed.access_token !== "string" || !parsed.access_token) {
      return null;
    }
    await client.setTokens({
      accessToken: parsed.access_token,
      expiresIn:
        typeof parsed.expires_in === "number" ? parsed.expires_in : undefined,
      refreshToken:
        typeof parsed.refresh_token === "string"
          ? parsed.refresh_token
          : tokenSet.refreshToken,
    });
    return parsed.access_token;
  } catch {
    return null;
  }
}
