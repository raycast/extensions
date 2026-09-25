import { OAuth } from "@raycast/api";
import { httpRequest } from "./http";

/**
 * Public OAuth client registered at idp.pushtodisplay.com for the Raycast
 * extension. PKCE public client — no secret. Redirect URI:
 * `raycast://oauth?package_name=Extension` (OAuth.RedirectMethod.App).
 */
const OAUTH_CLIENT_ID = "ptd-raycast";

const IDP_BASE = "https://idp.pushtodisplay.com/oauth/v1.0";
const SCOPES = "openid push management";

const tokenClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App,
  providerName: "PushToDisplay",
  description: "Connect your PushToDisplay account",
});

export type Auth = { kind: "oauth"; accessToken: string };

/** Drop stored OAuth tokens (used when the IdP rejects them, e.g. 401). */
export async function clearOAuthTokens(): Promise<void> {
  await tokenClient.removeTokens();
}

/**
 * Resolve OAuth credentials from the Keychain — authorizes via PKCE on first
 * use and refreshes transparently when the access token is expired.
 */
export async function getAuth(): Promise<Auth> {
  let tokens = await tokenClient.getTokens();
  if (!tokens) {
    const authRequest = await tokenClient.authorizationRequest({
      endpoint: `${IDP_BASE}/authorize`,
      clientId: OAUTH_CLIENT_ID,
      scope: SCOPES,
    });
    const { authorizationCode } = await tokenClient.authorize(authRequest);
    await tokenClient.setTokens(await exchangeCode(authRequest, authorizationCode));
    tokens = await tokenClient.getTokens();
  }

  // Raycast refreshes automatically; guard explicitly in case the stored token
  // is already past expiry and no background refresh happened.
  if (tokens && tokens.refreshToken && tokens.isExpired()) {
    await tokenClient.setTokens(await refreshTokens(tokens.refreshToken));
    tokens = await tokenClient.getTokens();
  }

  if (!tokens?.accessToken) {
    throw new Error('Could not obtain a PushToDisplay access token. Try "Logout" and sign in again.');
  }
  return { kind: "oauth", accessToken: tokens.accessToken };
}

async function exchangeCode(authRequest: OAuth.AuthorizationRequest, code: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: OAUTH_CLIENT_ID,
    code,
    code_verifier: authRequest.codeVerifier,
    redirect_uri: authRequest.redirectURI,
  });
  return tokenRequest(params);
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: OAUTH_CLIENT_ID,
    refresh_token: refreshToken,
  });
  return tokenRequest(params);
}

async function tokenRequest(params: URLSearchParams): Promise<OAuth.TokenResponse> {
  const { status, text } = await httpRequest(
    "POST",
    `${IDP_BASE}/token`,
    { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    params.toString(),
  );
  if (status < 200 || status >= 300) {
    throw new Error(`OAuth token request failed (${status}): ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text) as OAuth.TokenResponse;
  } catch {
    throw new Error(`OAuth token response was not JSON: ${text.slice(0, 300)}`);
  }
}
