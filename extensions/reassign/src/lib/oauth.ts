import { LocalStorage, OAuth } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { withSessionLock } from "./session-lock";
import { AUTHORIZE_URL, CLIENT_ID, OAUTH_RESOURCE, RAYCAST_REDIRECT, SCOPES, TOKEN_URL } from "./wire";

// The `resource` (RFC 8707) audience must ride the authorize and token calls,
// but never the refresh call. Without it the token endpoint defaults the
// audience to /api/mcp and rejects the request. `@raycast/utils` OAuthService
// cannot add a body field to the token POST, so we own the PKCEClient here.

/** Thrown when there is no live session and the caller must sign in again. */
export class NotAuthorizedError extends Error {
  constructor(message = "Not signed in to Reassign") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

/** Thrown when a sign-out cancelled an in-flight refresh. Not a dead grant. */
export class SignedOutError extends NotAuthorizedError {
  constructor(message = "Signed out during refresh") {
    super(message);
    this.name = "SignedOutError";
  }
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Reassign",
  providerIcon: "icon.png",
  providerId: "reassign",
  description: "Connect your Reassign account to see and plan your day.",
});

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

const SESSION_KEY = "reassign-session";
interface SessionState {
  generation: string;
  signedOut: boolean;
}
async function sessionState(): Promise<SessionState | undefined> {
  const value = await LocalStorage.getItem<string>(SESSION_KEY);
  if (!value) return undefined;
  // A corrupt value must not brick every auth call. Treat it as no session.
  try {
    return JSON.parse(value) as SessionState;
  } catch {
    return undefined;
  }
}

// Before the first stored session, every command shares the same logout epoch.
// Only signOut rotates it: successful logins must not cancel one another.
function sessionGeneration(state: SessionState | undefined): string {
  return state?.generation ?? "initial";
}

class TokenEndpointError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Run the full sign-in: authorize in the browser, then exchange the code. */
export async function signIn(options?: { automatic?: boolean }): Promise<void> {
  // Snapshot the session before opening the browser. A signOut that completes
  // while the browser is open is detected at commit time against this snapshot.
  // `generation` is rotated only by signOut, so it stays stable across logins
  // and concurrent sign-ins cannot cancel each other.
  const generation = await withSessionLock(async (signal) => {
    const state = await sessionState();
    signal.throwIfAborted();
    if (options?.automatic && state?.signedOut) throw new SignedOutError();
    return sessionGeneration(state);
  });
  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId: CLIENT_ID,
    scope: SCOPES,
    extraParameters: { resource: OAUTH_RESOURCE },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(authorizationCode, authRequest.redirectURI, authRequest.codeVerifier);
  await withSessionLock(async (signal) => {
    const state = await sessionState();
    signal.throwIfAborted();
    // A changed logout epoch cancels this flow even if another login has
    // already cleared signedOut, or this explicit flow began while signed out.
    if (sessionGeneration(state) !== generation) throw new SignedOutError();
    await client.setTokens(tokens);
    signal.throwIfAborted();
    await LocalStorage.setItem(SESSION_KEY, JSON.stringify({ generation, signedOut: false }));
  });
}

/** Return a valid token for `withAccessToken`, and start the native OAuth flow when no session lives. */
export async function authorize(): Promise<string> {
  const generation = await withSessionLock(async (signal) => {
    const state = await sessionState();
    signal.throwIfAborted();
    return sessionGeneration(state);
  });
  try {
    return await getAccessToken();
  } catch (error) {
    if (!(error instanceof NotAuthorizedError)) throw error;
    if (sessionGeneration(await sessionState()) !== generation) throw new SignedOutError();
  }
  // A foreground command launch is an explicit request to connect. Background
  // reads and in-command recovery never call this provider automatically.
  await signIn();
  return getAccessToken();
}

/** The provider that `withAccessToken` wraps each view command with. */
export const reassignProvider = { client, authorize };

/** Remove credentials under the same cross-command lock as refresh commits. */
export async function signOut(): Promise<void> {
  await withSessionLock(async (signal) => {
    signal.throwIfAborted();
    await LocalStorage.setItem(SESSION_KEY, JSON.stringify({ generation: randomUUID(), signedOut: true }));
    signal.throwIfAborted();
    await client.removeTokens();
  });
}

/** Background-safe: never opens the OAuth flow. */
export async function getAccessToken(options?: { force?: boolean }): Promise<string> {
  return withSessionLock(async (signal) => {
    const state = await sessionState();
    signal.throwIfAborted();
    if (state?.signedOut) throw new SignedOutError("Signed out of Reassign");
    const tokens = await client.getTokens();
    signal.throwIfAborted();
    if (!tokens?.accessToken) throw new NotAuthorizedError();
    if (!options?.force && !tokens.isExpired()) return tokens.accessToken;
    if (!tokens.refreshToken) throw new NotAuthorizedError("Session expired");
    try {
      const fresh = await exchangeRefresh(tokens.refreshToken, signal);
      // If the lock was compromised while the fetch was in flight, the signal
      // aborted it; but if it resolved an instant before the compromise, bail
      // out before writing tokens into a lock we no longer own.
      signal.throwIfAborted();
      if (!fresh.refresh_token) fresh.refresh_token = tokens.refreshToken;
      await client.setTokens(fresh);
      signal.throwIfAborted();
      return fresh.access_token;
    } catch (error) {
      signal.throwIfAborted();
      // Only the OAuth invalid_grant response confirms a revoked/expired grant.
      if (error instanceof TokenEndpointError && error.status === 400 && error.code === "invalid_grant") {
        await client.removeTokens();
        throw new NotAuthorizedError("Session expired. Sign in again.");
      }
      throw error;
    }
  });
}

/** Exchange the authorization code for a token set. Sends `resource`. */
async function exchangeCode(code: string, redirectURI: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectURI || RAYCAST_REDIRECT,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
    resource: OAUTH_RESOURCE,
  });
  return postToken(body);
}

/** Refresh the token. Never sends `resource` (the audience rides the token). */
async function exchangeRefresh(refreshToken: string, signal?: AbortSignal): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });
  return postToken(body, signal);
}

async function postToken(body: URLSearchParams, signal?: AbortSignal): Promise<TokenResponse> {
  // Combine the session-lock signal (compromised lock) with the 15s timeout so a
  // stolen lock aborts the refresh immediately, before any token writeback.
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const raw: unknown = await response.json().catch(() => undefined);
  const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : undefined;
  if (!response.ok) {
    throw new TokenEndpointError(
      `Could not connect to Reassign (${response.status}). Try again.`,
      response.status,
      typeof payload?.error === "string" ? payload.error : undefined,
    );
  }
  if (
    !payload ||
    typeof payload.access_token !== "string" ||
    !payload.access_token ||
    (payload.refresh_token !== undefined && typeof payload.refresh_token !== "string") ||
    (payload.expires_in !== undefined &&
      (typeof payload.expires_in !== "number" || !Number.isFinite(payload.expires_in) || payload.expires_in <= 0))
  ) {
    throw new Error("Reassign returned an invalid token response. Try again.");
  }
  return payload as unknown as TokenResponse;
}
