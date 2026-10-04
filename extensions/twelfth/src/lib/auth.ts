import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { CONTEXT_CACHE_KEY, OAUTH } from "./config";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Twelfth",
  providerIcon: "icon.png",
  providerId: "twelfth",
  description: "Connect Raycast to your Twelfth workspace. You'll choose the workspace on the next page.",
});

const CLIENT_ID_KEY = "oauth.clientId";
const EMAIL_KEY = "oauth.email";
const EPOCH_KEY = "oauth.epoch";

/** Twelfth won't accept this install's credential. Cached data from before it is no longer this person's to show. */
export class AuthError extends Error {}

/** No usable OAuth session: never signed in, or the connection was ended in Twelfth. */
export class NotSignedInError extends AuthError {
  constructor(message = "Not connected to Twelfth") {
    super(message);
  }
}

export function apiKey(): string | undefined {
  const { apiKey } = getPreferenceValues<Preferences>();
  return apiKey?.trim() || undefined;
}

/**
 * The OAuth client id for this install. The server allows open dynamic client
 * registration, so each install registers itself once (as every MCP client
 * does) and keeps the id. No secret: Raycast is a public PKCE client.
 */
async function clientId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(CLIENT_ID_KEY);
  if (stored) return stored;
  const response = await fetch(OAUTH.register, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Raycast",
      client_uri: "https://www.raycast.com",
      redirect_uris: [OAUTH.redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: OAUTH.scope,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { client_id?: string; error_description?: string };
  if (!response.ok || !body.client_id) {
    throw new Error(body.error_description ?? `Couldn't register with Twelfth (${response.status})`);
  }
  await LocalStorage.setItem(CLIENT_ID_KEY, body.client_id);
  return body.client_id;
}

type TokenResponse = OAuth.TokenResponse & { id_token?: string; error?: string; error_description?: string };

/** The token endpoint's answers that mean the grant itself is gone, as opposed to a failed request. */
const DEAD_GRANT = new Set(["invalid_grant", "invalid_client", "unauthorized_client"]);

class TokenError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
  /** True when signing in again is the only way forward; false for an outage worth riding out. */
  get dead() {
    return this.code !== undefined && DEAD_GRANT.has(this.code);
  }
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetch(OAUTH.token, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, resource: OAUTH.resource }),
    });
  } catch {
    throw new TokenError("Couldn't reach Twelfth to renew your sign-in. Try again shortly.");
  }
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.access_token) {
    throw new TokenError(
      body.error_description ?? body.error ?? `Twelfth sign-in failed (${response.status})`,
      body.error,
    );
  }
  return body;
}

/**
 * Bumped whenever the OAuth connection changes (sign-in, sign-out, a dead
 * grant). Readers that started under an older connection must not write what
 * they read into a cache the new connection will use.
 */
export async function connectionEpoch(): Promise<number> {
  return (await LocalStorage.getItem<number>(EPOCH_KEY)) ?? 0;
}

async function bumpConnection() {
  await LocalStorage.setItem(EPOCH_KEY, (await connectionEpoch()) + 1);
  await LocalStorage.removeItem(CONTEXT_CACHE_KEY);
}

/** The signed-in person's email, from the ID token, so "mine" can be told apart. */
async function rememberEmail(idToken: string | undefined) {
  if (!idToken) return;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { email?: string };
    if (payload.email) await LocalStorage.setItem(EMAIL_KEY, payload.email.toLowerCase());
  } catch {
    // An unreadable ID token only costs the "mine" filter.
  }
}

export async function signedInEmail(): Promise<string | undefined> {
  if (apiKey()) return undefined;
  return LocalStorage.getItem<string>(EMAIL_KEY);
}

/**
 * A usable token without any UI: the workspace key, a live access token, or a
 * refreshed one. Background commands (the menu bar, AI tools) use this so they
 * never pop an OAuth window on their own.
 */
export async function storedToken(): Promise<string | undefined> {
  const key = apiKey();
  if (key) return key;
  // Commands read several tools at once. One refresh between them: the server
  // rotates refresh tokens, so parallel refreshes would race each other.
  refreshing ??= readOrRefresh().finally(() => (refreshing = undefined));
  return refreshing;
}

let refreshing: Promise<string | undefined> | undefined;

/**
 * Refresh even though the stored token hasn't expired: the server refused it
 * (keys rotated, clock skew), and the refresh token may still be good.
 */
export async function forceRefresh(): Promise<string | undefined> {
  if (apiKey()) return undefined;
  // Its own shared promise: joining an ordinary refresh in flight could hand
  // back the very token the server just refused.
  forcing ??= readOrRefresh(true).finally(() => (forcing = undefined));
  return forcing;
}

let forcing: Promise<string | undefined> | undefined;

async function readOrRefresh(force = false): Promise<string | undefined> {
  const tokens = await client.getTokens();
  if (!tokens?.accessToken) return undefined;
  if (!force && !tokens.isExpired()) return tokens.accessToken;
  if (!tokens.refreshToken) return undefined;
  try {
    const refreshed = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: await clientId(),
    });
    await client.setTokens({ ...refreshed, refresh_token: refreshed.refresh_token ?? tokens.refreshToken });
    return refreshed.access_token;
  } catch (error) {
    // Only a dead grant (revoked in Settings → AI & agents, or rotated out)
    // means signing in again. A timeout or a 5xx keeps the tokens: the refresh
    // token is likely still good, and the next attempt will use it.
    if (!(error instanceof TokenError && error.dead)) throw error;
    await client.removeTokens();
    await bumpConnection();
    return undefined;
  }
}

/**
 * A token, signing in through the browser when there is none. Shared between
 * concurrent callers: a command reads several tools at once, and each must not
 * open its own sign-in window.
 */
export function authorize(): Promise<string> {
  authorizing ??= signIn().finally(() => (authorizing = undefined));
  return authorizing;
}

let authorizing: Promise<string> | undefined;

/**
 * Twelfth ended the connection: forget it and sign in again, once, however
 * many requests found out at the same moment.
 */
export function reconnect(): Promise<string> {
  reconnecting ??= (async () => {
    await signOut();
    return authorize();
  })().finally(() => (reconnecting = undefined));
  return reconnecting;
}

let reconnecting: Promise<string> | undefined;

async function signIn(): Promise<string> {
  const existing = await storedToken();
  if (existing) return existing;

  const id = await clientId();
  const request = await client.authorizationRequest({
    endpoint: OAUTH.authorize,
    clientId: id,
    scope: OAUTH.scope,
    extraParameters: { resource: OAUTH.resource },
  });
  const { authorizationCode } = await client.authorize(request);
  try {
    const tokens = await tokenRequest({
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
      client_id: id,
    });
    await client.setTokens(tokens);
    await rememberEmail(tokens.id_token);
    // The new connection may be to another workspace.
    await bumpConnection();
    return tokens.access_token;
  } catch (error) {
    // The registration was removed server-side: register afresh next time.
    if (error instanceof TokenError && error.code === "invalid_client") await LocalStorage.removeItem(CLIENT_ID_KEY);
    throw error;
  }
}

/** Forget the OAuth session so the next command signs in again. */
export async function signOut() {
  await client.removeTokens();
  await LocalStorage.removeItem(EMAIL_KEY);
  await bumpConnection();
}
