import { LocalStorage, OAuth } from "@raycast/api";

/**
 * Contra OAuth (PKCE + dynamic client registration).
 *
 * Contra exposes a standard OAuth 2.0 server for its MCP endpoint:
 *   authorize:  https://contra.com/api/mcp/oauth/authorize
 *   token:      https://contra.com/api/mcp/oauth/token
 *   register:   https://contra.com/api/mcp/oauth/register   (dynamic, public client)
 *   scope:      mcp:tools   ·   PKCE S256   ·   token_endpoint_auth_method = none
 *
 * The client is registered dynamically (no shipped client_id). We register once
 * per install, keyed by the Raycast redirect URI, and cache the client_id in
 * LocalStorage.
 */

const AUTHORIZE_URL = "https://contra.com/api/mcp/oauth/authorize";
const TOKEN_URL = "https://contra.com/api/mcp/oauth/token";
const REGISTER_URL = "https://contra.com/api/mcp/oauth/register";
const SCOPE = "mcp:tools";
const CLIENT_ID_KEY = "contra-oauth-client-id";
// Raycast's RedirectMethod.Web uses this single static redirect URL for all
// extensions, so we can register the OAuth client up front with the exact URI.
const REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Contra",
  providerIcon: "extension-icon.png",
  providerId: "contra",
  description: "Connect your Contra account to view finances and projects.",
});

// Coalesces concurrent registration attempts (e.g. menu-bar + a command
// launching together) onto a single request so we never orphan a client_id.
let registrationInFlight: Promise<string> | null = null;

/** Register (or reuse) a public OAuth client for the given redirect URI. */
async function getClientId(redirectURI: string): Promise<string> {
  const stored = await LocalStorage.getItem<string>(CLIENT_ID_KEY);
  if (stored) return stored;

  if (!registrationInFlight) {
    registrationInFlight = registerClient(redirectURI).finally(() => {
      registrationInFlight = null;
    });
  }
  return registrationInFlight;
}

async function registerClient(redirectURI: string): Promise<string> {
  const res = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Raycast Contra",
      redirect_uris: [redirectURI],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Contra client registration failed (${res.status}): ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { client_id: string };
  await LocalStorage.setItem(CLIENT_ID_KEY, data.client_id);
  return data.client_id;
}

/**
 * Returns a valid access token, reusing the stored session whenever possible.
 * Only starts the interactive flow when there is no stored token at all — a
 * failed refresh keeps the existing token so a transient error never forces a
 * re-login across commands. (mcp.ts triggers forceReauthorize() on a real 401.)
 */
export async function getAccessToken(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    return authorize();
  }
  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    const refreshed = await tryRefresh(tokenSet.refreshToken);
    return refreshed ?? tokenSet.accessToken;
  }
  return tokenSet.accessToken;
}

/**
 * Forces a token refresh (or full re-auth) and returns a fresh access token.
 * Called when the API rejects the current token (401/invalid_token).
 */
export async function forceReauthorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.refreshToken) {
    const refreshed = await tryRefresh(tokenSet.refreshToken);
    if (refreshed) return refreshed;
  }
  return authorize();
}

/** Full interactive PKCE authorization. */
export async function authorize(): Promise<string> {
  // Register (or reuse) the client first, then issue exactly ONE
  // authorizationRequest. Calling authorizationRequest more than once before
  // authorize() causes an OAuth state mismatch.
  const clientId = await getClientId(REDIRECT_URI);

  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId,
    scope: SCOPE,
  });

  const { authorizationCode } = await client.authorize(authRequest);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: authRequest.codeVerifier,
      client_id: clientId,
      redirect_uri: authRequest.redirectURI,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Token exchange failed (${res.status}): ${await res.text()}`,
    );
  }
  const tokens = (await res.json()) as TokenResponse;
  await client.setTokens(toTokenSet(tokens));
  return tokens.access_token;
}

/**
 * Attempts a refresh-token grant. Returns the new access token on success, or
 * null on failure (caller decides whether to fall back to stale token or
 * full re-auth). Preserves the old refresh token if the server doesn't rotate.
 */
async function tryRefresh(refreshToken: string): Promise<string | null> {
  const clientId = (await LocalStorage.getItem<string>(CLIENT_ID_KEY)) ?? "";
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        scope: SCOPE,
      }),
    });
    if (!res.ok) return null;
    const tokens = (await res.json()) as TokenResponse;
    if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
    await client.setTokens(toTokenSet(tokens));
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await client.removeTokens();
  await LocalStorage.removeItem(CLIENT_ID_KEY);
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

function toTokenSet(tokens: TokenResponse): OAuth.TokenSetOptions {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope ?? SCOPE,
  };
}
