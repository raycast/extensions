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
 * for it once, register a client with it via the existing DCR endpoint.
 */
import { LocalStorage, OAuth } from "@raycast/api";

export const BASE_URL = "https://orbiform.cc";

// Best-effort cache to avoid re-registering a DCR client on every first
// run. NOT the source of truth for which client_id issued the currently
// stored tokens — see the scope-encoding comment below for why.
const CLIENT_ID_CACHE_KEY = "orbiform_oauth_client_id";
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

// Raycast's OAuth.PKCEClient stores accessToken/refreshToken/scope/expiresIn
// together as ONE atomic write per setTokens() call. Two commands that both
// complete their first-run flow around the same time each call setTokens()
// independently — whichever call lands last simply wins outright, which is
// fine (a full, internally-consistent tuple either way). The bug this
// extension used to have was pairing the tokens with a client_id kept in a
// *separate* LocalStorage key, written by a *separate* call: two flows'
// setItem/setTokens pairs could then interleave and leave one flow's
// client_id stored next to the other flow's refresh_token. Fix: don't keep
// client_id anywhere separate. Smuggle it inside the `scope` string that's
// already part of the same setTokens() call, so it can never be torn apart
// from the tokens it belongs to. `scope` here is purely local bookkeeping —
// it's never sent back to the server (token requests send client_id
// directly), so repurposing it is safe.
const SCOPE_CLIENT_ID_SEPARATOR = "::cid=";

function encodeScope(scope: string | undefined, clientId: string): string {
  return `${scope ?? SCOPE}${SCOPE_CLIENT_ID_SEPARATOR}${clientId}`;
}

function decodeScope(encoded: string | undefined): { scope?: string; clientId?: string } {
  if (!encoded) return {};
  const i = encoded.indexOf(SCOPE_CLIENT_ID_SEPARATOR);
  if (i === -1) return { scope: encoded };
  return { scope: encoded.slice(0, i), clientId: encoded.slice(i + SCOPE_CLIENT_ID_SEPARATOR.length) };
}

/**
 * Registers (once) a Raycast OAuth client via Orbiform's existing Dynamic
 * Client Registration endpoint, using the exact redirect URI Raycast
 * itself computed for this extension. Result is cached after the first
 * successful call purely to avoid extra registration requests on later
 * runs — see the note on CLIENT_ID_CACHE_KEY above for why this cache
 * being stale or lost under a race is harmless rather than corrupting.
 */
async function getOrRegisterClientId(redirectUri: string): Promise<string> {
  const cached = await LocalStorage.getItem<string>(CLIENT_ID_CACHE_KEY);
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
  await LocalStorage.setItem(CLIENT_ID_CACHE_KEY, data.client_id);
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
      const { clientId } = decodeScope(existing.scope);
      if (!clientId) throw new Error("Orbiform client_id not found — please reconnect.");
      try {
        const refreshed = await refreshTokens(existing.refreshToken, clientId);
        await client.setTokens({
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          scope: encodeScope(refreshed.scope, clientId),
          expiresIn: refreshed.expires_in,
        });
        return refreshed.access_token;
      } catch (refreshError) {
        // A stored refresh_token that no longer matches its paired
        // client_id fails here every time otherwise. Clear it so the next
        // call runs a full fresh authorize() instead of looping on a
        // refresh that can never succeed.
        await client.removeTokens();
        throw refreshError;
      }
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

  // clientId travels inside `scope`, written in this single setTokens()
  // call — there is no separate write for it to race against.
  await client.setTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    scope: encodeScope(tokens.scope, clientId),
    expiresIn: tokens.expires_in,
  });
  return tokens.access_token;
}
