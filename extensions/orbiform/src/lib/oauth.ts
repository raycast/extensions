/**
 * OAuth 2.0 + PKCE against Orbiform's existing MCP OAuth server (see
 * src/lib/mcp-oauth.ts + src/app/oauth/authorize in the main Orbiform
 * repo) — the SAME authorization server claude.ai's "Add custom connector"
 * flow already uses in production, not a separate Raycast-only auth system.
 *
 * The server is pinned to production and is NOT a user preference — there
 * is no "Orbiform Base URL" setting anywhere in this extension anymore, on
 * purpose. (It used to be configurable for local dev testing, but that let
 * a stale token/client_id from one server leak into a session against the
 * other, which was a confusing way to break things for no real benefit
 * once local testing was done — so it's hardcoded here instead.)
 *
 * Client registration is dynamic (RFC 7591, POST /api/mcp/register)
 * instead of a hardcoded client_id: Raycast's PKCEClient computes its own
 * redirect URI internally (based on redirectMethod), and that exact string
 * must be pre-registered on the Orbiform side before /oauth/authorize will
 * accept it. Rather than guess/hardcode that URI, we ask the PKCEClient
 * for it once, register a client with it via the existing DCR endpoint,
 * and cache the returned client_id in LocalStorage — every run after the
 * first is just a cache read, no extra request.
 */
import { LocalStorage, OAuth } from "@raycast/api";

export const BASE_URL = "https://orbiform.cc";

const CLIENT_ID_KEY = "orbiform_oauth_client_id";
const SCOPE = "mcp";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Orbiform",
  providerIcon: "icon.png",
  providerId: "orbiform",
  description: "Connect your Orbiform account so you can manage your forms.",
});

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Registers (once) a Raycast OAuth client via Orbiform's existing Dynamic
 * Client Registration endpoint, using the exact redirect URI Raycast
 * itself computed for this extension. Result is cached after the first
 * successful call.
 */
async function getOrRegisterClientId(redirectUri: string): Promise<string> {
  const cached = await LocalStorage.getItem<string>(CLIENT_ID_KEY);
  if (cached) return cached;

  const response = await fetch(`${BASE_URL}/api/mcp/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Orbiform for Raycast",
      redirect_uris: [redirectUri],
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Orbiform client registration failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await response.json()) as { client_id: string };
  await LocalStorage.setItem(CLIENT_ID_KEY, data.client_id);
  return data.client_id;
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authorizationCode: string,
  clientId: string
): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(`${BASE_URL}/api/mcp/token`, { method: "POST", body: params });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Token exchange failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as TokenResponse;
}

async function refreshTokens(refreshToken: string, clientId: string): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(`${BASE_URL}/api/mcp/token`, { method: "POST", body: params });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Token refresh failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  const tokenResponse = (await response.json()) as TokenResponse;
  if (!tokenResponse.refresh_token) tokenResponse.refresh_token = refreshToken;
  return tokenResponse;
}

/**
 * Returns a valid access token: runs the full login+consent flow the first
 * time (opens the system browser), silently refreshes on later runs once
 * the token is close to expiry, and otherwise returns the cached token
 * instantly. Call this at the top of every command before hitting the API.
 */
export async function authorize(): Promise<string> {
  const existing = await client.getTokens();
  if (existing?.accessToken) {
    if (existing.refreshToken && existing.isExpired()) {
      const clientId = await LocalStorage.getItem<string>(CLIENT_ID_KEY);
      if (!clientId) throw new Error("Orbiform client_id not found — please reconnect.");
      const refreshed = await refreshTokens(existing.refreshToken, clientId);
      await client.setTokens({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        scope: refreshed.scope,
      });
      return refreshed.access_token;
    }
    return existing.accessToken;
  }

  // First run: learn the redirect URI Raycast will actually use, register
  // an OAuth client for it via DCR, then run the real authorization
  // request with that client_id.
  const probeRequest = await client.authorizationRequest({
    endpoint: `${BASE_URL}/oauth/authorize`,
    clientId: "pending",
    scope: SCOPE,
  });
  const clientId = await getOrRegisterClientId(probeRequest.redirectURI);

  const authRequest = await client.authorizationRequest({
    endpoint: `${BASE_URL}/oauth/authorize`,
    clientId,
    scope: SCOPE,
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode, clientId);
  await client.setTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    scope: tokens.scope,
  });
  return tokens.access_token;
}
