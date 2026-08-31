import { OAuth } from "@raycast/api";
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

/** Coalesce concurrent refreshes so parallel calls do not race the endpoint. */
let refreshInFlight: Promise<string> | null = null;
// Identifies the current in-flight refresh, so its cleanup never nulls a
// successor that a sign-out let start in the meantime.
let refreshId = 0;

// Bumped on every sign-out. A refresh that started before a sign-out must not
// store new tokens after it (that would silently undo the logout).
let logoutEpoch = 0;

// Set synchronously on sign-out, cleared only on a fresh sign-in. It closes the
// window where a refresh starts during `signOut`'s async token removal: that
// refresh reads the still-stored token and captures the new epoch, so only this
// flag (checked before `setTokens`) stops it from re-authenticating.
let signedOut = false;

/** A token-endpoint failure that carries the HTTP status (undefined = network). */
class TokenEndpointError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "TokenEndpointError";
    this.status = status;
  }
}

// Serialize every token-store mutation — sign-in, the refresh write, and
// sign-out — so a guard check and its write can never straddle a concurrent
// logout. Callers await the previous mutation before running, then release.
// (Raycast runs each command in its own process, so this orders writes within a
// command; cross-command safety is bounded by the token store, which is all the
// API exposes.)
let tokenLockTail: Promise<unknown> = Promise.resolve();
function withTokenLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = tokenLockTail.then(fn, fn);
  tokenLockTail = result.catch(() => undefined);
  return result;
}

/** Run the full sign-in: authorize in the browser, then exchange the code. */
export async function signIn(): Promise<void> {
  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId: CLIENT_ID,
    scope: SCOPES,
    extraParameters: { resource: OAUTH_RESOURCE },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(authorizationCode, authRequest.redirectURI, authRequest.codeVerifier);
  await withTokenLock(async () => {
    signedOut = false;
    await client.setTokens(tokens);
  });
}

/** Return a valid token for `withAccessToken`, and start the native OAuth flow when no session lives. */
export async function authorize(): Promise<string> {
  const tokens = await client.getTokens();
  if (tokens?.accessToken && !tokens.isExpired()) return tokens.accessToken;
  if (tokens?.refreshToken) {
    try {
      return await refresh(tokens.refreshToken);
    } catch (error) {
      // A sign-out cancelled the refresh — respect the logout, never re-authenticate.
      if (error instanceof SignedOutError) throw error;
      // A dead grant means re-consent; a transient error must not pop a browser.
      if (!(error instanceof NotAuthorizedError)) throw error;
    }
  }
  await signIn();
  const fresh = await client.getTokens();
  if (!fresh?.accessToken) throw new Error("Sign-in returned no token");
  return fresh.accessToken;
}

/** The provider that `withAccessToken` wraps each view command with. */
export const reassignProvider = { client, authorize };

/** Clear the stored session. The next call forces a new sign-in. */
export async function signOut(): Promise<void> {
  // Set the guards synchronously so a refresh that starts now already sees them;
  // the removal itself runs under the lock, serialized with any refresh write.
  signedOut = true;
  logoutEpoch += 1;
  refreshInFlight = null;
  await withTokenLock(() => client.removeTokens());
}

/** True when a token set is stored (it may still need a refresh). */
export async function isSignedIn(): Promise<boolean> {
  const tokens = await client.getTokens();
  return Boolean(tokens?.accessToken);
}

/**
 * Return a valid access token, refreshing if expired.
 * Pass `force` to refresh even when the current token looks valid (used after a
 * 401 from the API). Throws NotAuthorizedError when there is no session.
 */
export async function getAccessToken(options?: { force?: boolean }): Promise<string> {
  const tokens = await client.getTokens();
  if (!tokens?.accessToken) {
    throw new NotAuthorizedError();
  }
  const mustRefresh = options?.force || tokens.isExpired();
  if (!mustRefresh) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    await signOut();
    throw new NotAuthorizedError("Session expired");
  }
  return refresh(tokens.refreshToken);
}

/** Refresh the access token. Concurrent callers share one in-flight request. */
async function refresh(refreshToken: string): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  const epoch = logoutEpoch;
  const id = ++refreshId;
  refreshInFlight = (async () => {
    try {
      const tokens = await exchangeRefresh(refreshToken);
      // Keep the old refresh token when the server omits a new one, or the next
      // refresh finds no token and forces an unneeded sign-in.
      if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
      // Guard and write under the lock, so a logout cannot land between them.
      // `signedOut` catches a refresh that started during/after a sign-out; the
      // epoch catches one that started before a sign-out then intervening state.
      return await withTokenLock(async () => {
        if (signedOut || logoutEpoch !== epoch) {
          throw new SignedOutError();
        }
        await client.setTokens(tokens);
        return tokens.access_token;
      });
    } finally {
      // Clear only our own slot. A sign-out may have already nulled it and a
      // later refresh may own it now — do not clobber that successor.
      if (refreshId === id) refreshInFlight = null;
    }
  })();
  return refreshInFlight;
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
async function exchangeRefresh(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });
  try {
    return await postToken(body);
  } catch (error) {
    const status = error instanceof TokenEndpointError ? error.status : undefined;
    // Only a 4xx means the grant is dead — sign out and force a fresh sign-in.
    // A network error or a 5xx is transient: keep the session and report it, so
    // a flaky connection does not log the user out.
    if (status !== undefined && status >= 400 && status < 500) {
      await signOut();
      throw new NotAuthorizedError(error instanceof Error ? error.message : "Refresh failed");
    }
    throw error;
  }
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new TokenEndpointError(`Token endpoint ${response.status}: ${text}`, response.status);
  }
  return (await response.json()) as TokenResponse;
}
