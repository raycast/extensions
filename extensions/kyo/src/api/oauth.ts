import { OAuth } from "@raycast/api";
import {
  ANON_KEY,
  DEFAULT_SCOPES,
  OAUTH_AUTHORIZE_URL,
  OAUTH_REVOKE_URL,
  OAUTH_TOKEN_URL,
  getClientId,
} from "./config";

/**
 * Kyo OAuth 2.0 (authorization code + PKCE, S256) as documented at
 * https://www.trykyo.com/docs/oauth
 *
 * Raycast's PKCEClient generates the code_verifier / code_challenge (S256) and
 * `state` for us, and manages the local redirect capture. We only wire in Kyo's
 * endpoints, the `apikey` header the token endpoint requires, and refresh-token
 * rotation (Kyo rotates the refresh token on every use).
 */

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Kyo",
  providerId: "kyo",
  providerIcon: "kyo-icon.png",
  description: "Connect your Kyo agencyOS workspace.",
});

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

interface OAuthErrorResponse {
  error: string;
  error_description?: string;
}

function formHeaders(): Record<string, string> {
  // The token & revoke endpoints are form-encoded POSTs and also need the
  // public apikey header (same anon key as REST requests).
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    apikey: ANON_KEY,
  };
}

async function readTokenResponse(response: Response): Promise<TokenResponse> {
  const body = (await response.json()) as TokenResponse | OAuthErrorResponse;
  if (!response.ok || "error" in body) {
    const err = body as OAuthErrorResponse;
    throw new Error(
      err.error_description ||
        err.error ||
        `Token request failed (${response.status})`,
    );
  }
  return body as TokenResponse;
}

/** Ensure we hold a valid access token, running the full sign-in flow if needed. */
export async function authorize(): Promise<string> {
  const existing = await client.getTokens();

  if (existing?.accessToken) {
    if (!existing.isExpired()) return existing.accessToken;
    if (existing.refreshToken) {
      try {
        const refreshed = await refreshTokens(existing.refreshToken);
        await client.setTokens(refreshed);
        return refreshed.access_token;
      } catch {
        // Refresh token expired / rotated / reuse-detected -> full re-authorize.
        await client.removeTokens();
      }
    }
    // Expired without a usable refresh token -> fall through to sign-in.
  }

  const authRequest = await client.authorizationRequest({
    endpoint: OAUTH_AUTHORIZE_URL,
    clientId: getClientId(),
    scope: DEFAULT_SCOPES,
  });

  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(authorizationCode, authRequest);
  await client.setTokens(tokens);
  return tokens.access_token;
}

async function exchangeCode(
  code: string,
  authRequest: OAuth.AuthorizationRequest,
): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("client_id", getClientId());
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: formHeaders(),
    body: params.toString(),
  });
  return readTokenResponse(response);
}

export async function refreshTokens(
  refreshToken: string,
): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", getClientId());

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: formHeaders(),
    body: params.toString(),
  });
  // Rotation: every refresh returns a new access + refresh pair and invalidates
  // the old refresh token. setTokens persists the new pair for us.
  return readTokenResponse(response);
}

/** Force a refresh right now and persist the rotated pair. Returns the new access token. */
export async function forceRefresh(): Promise<string | undefined> {
  const tokens = await client.getTokens();
  if (!tokens?.refreshToken) return undefined;
  const refreshed = await refreshTokens(tokens.refreshToken);
  await client.setTokens(refreshed);
  return refreshed.access_token;
}

/** RFC 7009 revocation + local credential wipe (used by "Log Out"). */
export async function logout(): Promise<void> {
  const tokens = await client.getTokens();
  if (tokens?.refreshToken) {
    const params = new URLSearchParams();
    params.append("token", tokens.refreshToken);
    params.append("token_type_hint", "refresh_token");
    params.append("client_id", getClientId());
    try {
      await fetch(OAUTH_REVOKE_URL, {
        method: "POST",
        headers: formHeaders(),
        body: params.toString(),
      });
    } catch {
      // best-effort; still clear local tokens
    }
  }
  await client.removeTokens();
}
