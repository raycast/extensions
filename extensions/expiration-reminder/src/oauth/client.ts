import { OAuth } from "@raycast/api";
import { ApiError, messageForStatus } from "../lib/errors";
import { getApiBaseUrl, getWebBaseUrl } from "../lib/preferences";
import { OAuthTokenResponse } from "../api/types";

/**
 * OAuth2 Authorization Code + PKCE public-client for Expiration Reminder.
 *
 * The backend now supports public clients (ENG-2640): the token and refresh
 * exchanges verify the S256 `code_verifier` against the stored `code_challenge`
 * and require NO `client_secret`. A public client cannot safely ship a secret, so
 * the `client_id` is a baked-in constant ({@link PUBLIC_CLIENT_ID}) rather than a
 * user preference. The consent flow is unchanged — Raycast's `OAuth.PKCEClient`
 * already sends `code_challenge`/`code_challenge_method=S256` on authorize.
 */
export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Expiration Reminder",
  providerIcon: "icon.png",
  description: "Connect your Expiration Reminder account to use the extension.",
});

/**
 * The registered first-party PUBLIC OAuth client id for this extension (ENG-2640).
 *
 * This client is flagged `IsPublic = 1` in production, so the token/refresh
 * exchanges authenticate via PKCE (S256 `code_verifier`) with NO `client_secret`.
 * Its redirect URI is `https://raycast.com/redirect/extension` (see REDIRECT_URI).
 * Verified public via a secretless `refresh_token` probe returning `invalid_grant`
 * (a confidential client returns `invalid_client`).
 */
export const PUBLIC_CLIENT_ID = "9C68AB28-E4AA-4B6F-B03D-952137BE29B7";

/** Refresh this many seconds before the token's real expiry, for clock skew safety. */
const REFRESH_BUFFER_SECONDS = 60;

/**
 * Raycast's default Web redirect URI carries a query string
 * (`https://raycast.com/redirect?packageName=Extension`). The Expiration Reminder
 * authorize endpoint appends the auth code with `?` instead of `&` when the
 * redirect_uri already has a query component, producing a double-`?` URL that hides
 * `code` from Raycast (the desktop app then never completes the exchange).
 *
 * Raycast's documented workaround for providers that don't handle query params in the
 * redirect is its query-less form below — with no `?`, the backend's append yields a
 * valid `…/extension?code=…&state=…`. The backend `?`-vs-`&` append bug is now fixed
 * (ENG-2640), but this query-less redirect is what the OAuth client is registered with,
 * so we keep it. It is passed via `extraParameters` on the authorize request AND reused
 * verbatim in the token exchange so the two `redirect_uri` values match.
 */
const REDIRECT_URI = "https://raycast.com/redirect/extension";

/**
 * Ensure we have a valid access token, refreshing proactively if it is (near)
 * expired. Triggers the consent flow on first use.
 */
export async function getAccessToken(): Promise<string> {
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      return refreshAccessToken();
    }
    return tokenSet.accessToken;
  }
  return authorize();
}

/**
 * Single-flight guards. Consent and refresh each perform a one-time token
 * exchange; if two callers race (e.g. a command whose view re-renders, or two
 * concurrent requests hitting an unauthenticated/expired state), we must run the
 * exchange once and share its result. Otherwise the backend mints two token pairs
 * and one is orphaned but still valid server-side (ENG-2671).
 */
let authInFlight: Promise<string> | null = null;
let refreshInFlight: Promise<string> | null = null;

/** Launch the browser consent flow and store the resulting tokens. */
export async function authorize(): Promise<string> {
  if (authInFlight) return authInFlight;
  authInFlight = runAuthorize().finally(() => {
    authInFlight = null;
  });
  return authInFlight;
}

async function runAuthorize(): Promise<string> {
  if (!PUBLIC_CLIENT_ID) {
    throw new ApiError(
      "This build has no OAuth client id configured. Set PUBLIC_CLIENT_ID in src/oauth/client.ts (ENG-2640).",
      0,
    );
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${getWebBaseUrl()}/oauth/authorize`,
    clientId: PUBLIC_CLIENT_ID,
    scope: "",
    extraParameters: { redirect_uri: REDIRECT_URI },
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await exchangeCodeForTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(toTokenSet(tokens));
  return tokens.access_token;
}

/**
 * Force a token refresh using the stored refresh token. If there is no refresh
 * token or the refresh fails (revoked/expired), fall back to a full re-auth so
 * the user gets a friendly consent prompt rather than a raw error.
 */
export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function runRefresh(): Promise<string> {
  const tokenSet = await oauthClient.getTokens();
  if (!tokenSet?.refreshToken) {
    return authorize();
  }
  try {
    const tokens = await refreshTokens(tokenSet.refreshToken);
    await oauthClient.setTokens(toTokenSet(tokens));
    return tokens.access_token;
  } catch {
    return authorize();
  }
}

/**
 * Sign out: revoke the token server-side (G-5 / ENG-2644), then clear it locally.
 *
 * The revoke call is best-effort — a network/HTTP failure must NOT leave the user
 * stuck signed in, so we always clear the local tokens afterward. Revoking either
 * the access or refresh token invalidates the whole connection server-side, and the
 * endpoint is idempotent (200 even for an already-invalid token).
 */
export async function signOut(): Promise<void> {
  try {
    const tokenSet = await oauthClient.getTokens();
    const token = tokenSet?.accessToken;
    if (token) await revokeToken(token);
  } catch {
    // Best-effort: ignore revoke failures and fall through to clearing locally.
  }
  await oauthClient.removeTokens();
}

/** POST {apiBaseUrl}/oauth/revoke (RFC 7009). Throws on network/HTTP failure. */
async function revokeToken(token: string): Promise<void> {
  const params = new URLSearchParams();
  params.append("token", token);
  params.append("token_type_hint", "access_token");
  const response = await fetch(`${getApiBaseUrl()}/oauth/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });
  if (!response.ok) {
    throw new ApiError(messageForStatus(response.status, undefined), response.status);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const tokenSet = await oauthClient.getTokens();
  return Boolean(tokenSet?.accessToken);
}

async function exchangeCodeForTokens(
  authRequest: OAuth.AuthorizationRequest,
  code: string,
): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("client_id", PUBLIC_CLIENT_ID);
  params.append("redirect_uri", REDIRECT_URI);
  // PKCE: the S256 verifier is what authenticates a public client — no secret.
  params.append("code_verifier", authRequest.codeVerifier);
  return postToken(params);
}

async function refreshTokens(refreshToken: string): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  // Public-client refresh: just client_id + refresh_token (no secret, no verifier).
  params.append("client_id", PUBLIC_CLIENT_ID);
  return postToken(params);
}

async function postToken(params: URLSearchParams): Promise<OAuthTokenResponse> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });
  } catch {
    throw new ApiError(messageForStatus(0, undefined), 0);
  }

  const text = await response.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(messageForStatus(response.status, body), response.status);
  }

  const tokens = body as OAuthTokenResponse;
  if (!tokens.access_token) {
    throw new ApiError("The token endpoint returned no access token.", response.status);
  }
  return tokens;
}

function toTokenSet(tokens: OAuthTokenResponse): OAuth.TokenSetOptions {
  const expiresIn = parseInt(tokens.expires_in, 10);
  const effective = (Number.isFinite(expiresIn) ? expiresIn : 3600) - REFRESH_BUFFER_SECONDS;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || undefined,
    expiresIn: Math.max(effective, REFRESH_BUFFER_SECONDS),
    scope: tokens.scope || undefined,
  };
}
