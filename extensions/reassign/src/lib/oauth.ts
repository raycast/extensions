import { OAuth } from "@raycast/api";
import {
  AUTHORIZE_URL,
  CLIENT_ID,
  OAUTH_RESOURCE,
  RAYCAST_REDIRECT,
  SCOPES,
  TOKEN_URL,
} from "./wire";

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

/** Run the full sign-in: authorize in the browser, then exchange the code. */
export async function signIn(): Promise<void> {
  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId: CLIENT_ID,
    scope: SCOPES,
    extraParameters: { resource: OAUTH_RESOURCE },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(
    authorizationCode,
    authRequest.redirectURI,
    authRequest.codeVerifier,
  );
  await client.setTokens(tokens);
}

/** Clear the stored session. The next call forces a new sign-in. */
export async function signOut(): Promise<void> {
  refreshInFlight = null;
  await client.removeTokens();
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
  refreshInFlight = (async () => {
    try {
      const tokens = await exchangeRefresh(refreshToken);
      // Keep the old refresh token when the server omits a new one, or the next
      // refresh finds no token and forces an unneeded sign-in.
      if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
      await client.setTokens(tokens);
      return tokens.access_token;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Exchange the authorization code for a token set. Sends `resource`. */
async function exchangeCode(
  code: string,
  redirectURI: string,
  codeVerifier: string,
): Promise<TokenResponse> {
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
    // A refused refresh means the grant is dead. Force a fresh sign-in.
    await signOut();
    throw new NotAuthorizedError(error instanceof Error ? error.message : "Refresh failed");
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
    throw new Error(`Token endpoint ${response.status}: ${text}`);
  }
  return (await response.json()) as TokenResponse;
}
