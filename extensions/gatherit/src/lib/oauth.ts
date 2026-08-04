import { OAuth } from "@raycast/api";

import { getApiToken, getBaseUrl } from "./preferences";

// `fetch` is a Node 22 global in the Raycast runtime — no import needed.

// Public/PKCE OAuth client registered in Gather's Clerk instance.
// Public clients carry no secret — the PKCE code verifier is the proof.
const CLIENT_ID = "eipKKIsmrnQucRol";
const SCOPE = "profile email";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Gather",
  providerId: "gather",
  providerIcon: "extension-icon.png",
  description: "Connect your Gather account to search and save references.",
});

type DiscoveryDoc = {
  authorization_endpoint: string;
  token_endpoint: string;
};

/**
 * Resolve OAuth endpoints from the configured Gather instance instead of
 * hardcoding a Clerk domain, so the same build works against dev, prod, or a
 * self-hosted instance. Clerk exposes this at the standard well-known path.
 */
async function discover(): Promise<DiscoveryDoc> {
  const res = await fetch(
    `${getBaseUrl()}/.well-known/oauth-authorization-server`,
  );
  if (!res.ok) {
    throw new Error(
      `OAuth discovery failed (${res.status}). Check your connection and try again.`,
    );
  }
  const doc = (await res.json()) as Partial<DiscoveryDoc>;
  if (!doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error("OAuth discovery document is missing required endpoints.");
  }
  return {
    authorization_endpoint: doc.authorization_endpoint,
    token_endpoint: doc.token_endpoint,
  };
}

async function exchangeCode(
  tokenEndpoint: string,
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const res = await fetch(tokenEndpoint, { method: "POST", body: params });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}).`);
  }
  return (await res.json()) as OAuth.TokenResponse;
}

async function refreshTokens(
  tokenEndpoint: string,
  refreshToken: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const res = await fetch(tokenEndpoint, { method: "POST", body: params });
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}).`);
  }
  const tokens = (await res.json()) as OAuth.TokenResponse;
  // Some providers omit refresh_token on refresh — keep the previous one.
  if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
  return tokens;
}

/**
 * Return a valid bearer token for `/api/v1`. Order:
 *   1. Static API-token preference (local dev / self-host escape hatch).
 *   2. A stored, non-expired OAuth access token (refreshing if needed).
 *   3. A fresh PKCE authorization flow (opens the browser once).
 */
export async function getToken(): Promise<string> {
  const staticToken = getApiToken();
  if (staticToken) return staticToken;

  const existing = await client.getTokens();
  // A valid (non-expired) access token is good to use as-is.
  if (existing?.accessToken && !existing.isExpired()) {
    return existing.accessToken;
  }
  // The access token is missing or expired. Refresh it if we have a refresh
  // token; otherwise fall through to a fresh PKCE flow. Returning the stale
  // access token here would just 401 on the next API call.
  if (existing?.refreshToken) {
    try {
      const { token_endpoint } = await discover();
      const refreshed = await refreshTokens(
        token_endpoint,
        existing.refreshToken,
      );
      await client.setTokens(refreshed);
      return refreshed.access_token;
    } catch {
      // Refresh failed (revoked/expired refresh token) — clear stale tokens
      // and fall through to a fresh PKCE authorization flow.
      await client.removeTokens();
    }
  }

  const { authorization_endpoint, token_endpoint } = await discover();
  const authRequest = await client.authorizationRequest({
    endpoint: authorization_endpoint,
    clientId: CLIENT_ID,
    scope: SCOPE,
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(
    token_endpoint,
    authRequest,
    authorizationCode,
  );
  await client.setTokens(tokens);
  return tokens.access_token;
}

/** Clear stored OAuth tokens (used by the "Sign Out" action). */
export async function signOut(): Promise<void> {
  await client.removeTokens();
}
