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

// Dedupe concurrent authorize() calls *within this process*: a command that
// fires off several API calls at once (each starting with `await
// authorize()`) would otherwise kick off several independent refresh/login
// flows against the same expired session. Sharing one in-flight promise
// makes that case race-free outright.
let inFlightAuthorize: Promise<string> | null = null;

/**
 * Returns a valid access token: runs the full login+consent flow the first
 * time (opens the system browser), silently refreshes on later runs once
 * the token is close to expiry, and otherwise returns the cached token
 * instantly. Call this at the top of every command before hitting the API.
 */
export async function authorize(): Promise<string> {
  if (inFlightAuthorize) return inFlightAuthorize;
  inFlightAuthorize = doAuthorize();
  try {
    return await inFlightAuthorize;
  } finally {
    inFlightAuthorize = null;
  }
}

/**
 * Thrown when authorize() fails in a way that a plain retry can't fix —
 * i.e. the stored refresh_token itself is bad. Commands can check for this
 * with `error instanceof OrbiformAuthError` and offer a "Reconnect" action
 * that calls reconnect(), instead of just showing a generic failure toast.
 */
export class OrbiformAuthError extends Error {}

/**
 * Forces a fresh login, discarding whatever is currently stored first. This
 * is the ONLY place tokens get deleted — deliberately, so it must be
 * triggered by an explicit user action (e.g. the "Reconnect" action wired
 * up in each command below, via OrbiformAuthError), never automatically
 * from inside a refresh failure. See the comment in doAuthorize()'s catch
 * block for why deleting automatically there is unsafe.
 */
export async function reconnect(): Promise<string> {
  await client.removeTokens();
  return authorize();
}

async function doAuthorize(): Promise<string> {
  const existing = await client.getTokens();
  if (existing?.accessToken) {
    if (existing.refreshToken && existing.isExpired()) {
      const { clientId } = decodeScope(existing.scope);
      if (!clientId) throw new OrbiformAuthError("Orbiform client_id not found — please reconnect.");
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
        // Two *separate* Raycast commands (separate processes — the
        // in-flight guard above only covers one process) can race to
        // refresh the same expired session: one succeeds and persists a
        // fresh token tuple around the same time the other's request comes
        // back rejected (e.g. the server already rotated/invalidated the
        // refresh_token this call sent). Raycast's LocalStorage exposes no
        // compare-and-delete, so ANY read-then-conditionally-delete here —
        // no matter how tight, even with a re-check right before the
        // delete — has a window where the other process's write lands
        // after our read but before our delete, and we'd erase the session
        // it just fixed. That's not a window worth narrowing with a
        // timeout; it's worth removing entirely.
        //
        // So: never delete here. A failed refresh just throws and leaves
        // storage untouched. If this failure was caused by the race above,
        // the other command's valid tokens are safe in storage and the
        // very next authorize() call (this command's retry, or any other
        // command) picks them up normally. If the refresh_token is
        // genuinely dead (not a race), every call keeps failing the same
        // way instead of silently self-healing — the user sees the error
        // and can trigger the "Reconnect" action (wired up in each command
        // via OrbiformAuthError below) to force a clean login. That's a
        // deliberate, explicit deletion instead of an automatic one racing
        // against other commands.
        const message = refreshError instanceof Error ? refreshError.message : String(refreshError);
        throw new OrbiformAuthError(message);
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
