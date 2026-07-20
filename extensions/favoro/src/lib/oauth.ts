import { OAuth } from "@raycast/api";
import { OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL, OAUTH_SCOPE, USER_AGENT, OAUTH_CLIENT_ID } from "./constants";

/**
 * OAuth PKCE client for FAVORO authentication
 */
export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "FAVORO",
  providerIcon: "extension_icon.png",
  description: "Connect your FAVORO account to access your bookmarks",
});

/**
 * Authorizes the user with FAVORO via OAuth PKCE flow.
 * Returns an access token for API requests.
 */
export async function authorize(): Promise<string> {
  const tokenSet = await oauthClient.getTokens();

  // Return existing valid token
  if (tokenSet?.accessToken && !tokenSet.isExpired()) {
    return tokenSet.accessToken;
  }

  // Try to refresh expired token
  if (tokenSet?.refreshToken && tokenSet.isExpired()) {
    try {
      const newTokens = await refreshTokens(tokenSet.refreshToken);
      await oauthClient.setTokens(newTokens);
      return newTokens.access_token;
    } catch {
      // Refresh failed, proceed with full auth flow
    }
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: OAUTH_AUTHORIZE_URL,
    clientId: OAUTH_CLIENT_ID,
    scope: OAUTH_SCOPE,
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await exchangeCodeForTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return tokens.access_token;
}

/**
 * Exchanges the authorization code for access and refresh tokens.
 */
async function exchangeCodeForTokens(
  authRequest: OAuth.AuthorizationRequest,
  code: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "X-Client": USER_AGENT,
    },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: authRequest.redirectURI,
      code_verifier: authRequest.codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${errorText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

/**
 * Refreshes the access token using the refresh token.
 */
async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "X-Client": USER_AGENT,
    },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh tokens: ${errorText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

/**
 * Gets the current access token, refreshing if necessary.
 * Throws if not authenticated.
 */
export async function getAccessToken(): Promise<string> {
  const tokenSet = await oauthClient.getTokens();

  if (!tokenSet?.accessToken) {
    throw new Error("Not authenticated");
  }

  // Refresh if expired
  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    const newTokens = await refreshTokens(tokenSet.refreshToken);
    await oauthClient.setTokens(newTokens);
    return newTokens.access_token;
  }

  return tokenSet.accessToken;
}

/**
 * Checks if the user is currently authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokenSet = await oauthClient.getTokens();
  return !!tokenSet?.accessToken;
}

/**
 * Logs out the user by clearing stored tokens.
 */
export async function logout(): Promise<void> {
  await oauthClient.removeTokens();
}
