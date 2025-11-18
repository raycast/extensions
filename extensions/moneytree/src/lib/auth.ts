import { OAuth, LocalStorage } from "@raycast/api";
import { OAuthTokenResponse } from "./types";
import { CLIENT_ID, REDIRECT_URI, OAUTH_BASE_URL, SDK_PLATFORM, SDK_VERSION, APP_BASE_URL } from "./constants";
import { clearCache } from "./cache";

// Create OAuth client for PKCE generation and token storage
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Moneytree",
  providerIcon: "moneytree-icon.png",
  description: "Connect your Moneytree account to view your financial data",
});

// Temporary storage key for code_verifier during auth flow
const CODE_VERIFIER_KEY = "moneytree_temp_code_verifier";

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<OAuthTokenResponse> {
  const response = await fetch(`${OAUTH_BASE_URL}/oauth/token.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mt-sdk-platform": SDK_PLATFORM,
      "mt-sdk-version": SDK_VERSION,
      Origin: APP_BASE_URL,
      Referer: `${APP_BASE_URL}/`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<OAuthTokenResponse>;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const response = await fetch(`${OAUTH_BASE_URL}/oauth/token.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mt-sdk-platform": SDK_PLATFORM,
      "mt-sdk-version": SDK_VERSION,
      Origin: APP_BASE_URL,
      Referer: `${APP_BASE_URL}/`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<OAuthTokenResponse>;
}

/**
 * Ensure we have a valid access token, refreshing if necessary
 * If no tokens exist, throw error directing user to authenticate command
 */
export async function ensureValidToken(): Promise<string> {
  const tokenSet = await client.getTokens();

  if (!tokenSet) {
    // No tokens found, user needs to authenticate
    throw new Error(
      "No authentication tokens found. Please use the 'Authenticate' command to connect your Moneytree account.",
    );
  }

  // Check if token is expired (with 5 minute buffer)
  if (tokenSet.isExpired()) {
    try {
      // Refresh the token
      if (!tokenSet.refreshToken) {
        throw new Error("No refresh token available");
      }

      const tokenResponse = await refreshAccessToken(tokenSet.refreshToken);
      await client.setTokens({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
      });
      return tokenResponse.access_token;
    } catch {
      // If refresh fails, clear tokens and require re-authentication
      await client.removeTokens();
      throw new Error(
        "Token refresh failed. Please use the 'Authenticate' command to reconnect your Moneytree account.",
      );
    }
  }

  return tokenSet.accessToken;
}

/**
 * Get a valid access token (main entry point)
 * This will check expiration and refresh if needed
 */
export async function getAccessToken(): Promise<string> {
  return ensureValidToken();
}

/**
 * Logout - clear all stored tokens and cache
 */
export async function logout(): Promise<void> {
  await client.removeTokens();
  // Also clear any temporary code_verifier
  await LocalStorage.removeItem(CODE_VERIFIER_KEY);
  // Clear all cached data
  clearCache();

  // Verify tokens are actually cleared
  const tokenSet = await client.getTokens();
  if (tokenSet !== null) {
    console.debug("[Auth] Warning: Tokens still exist after logout, attempting force clear");
    // Force clear by trying again
    await client.removeTokens();
  }
}

/**
 * Check if user is authenticated (has tokens)
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokenSet = await client.getTokens();
  if (!tokenSet) {
    return false;
  }
  // Also check if token is expired (with buffer)
  if (tokenSet.isExpired()) {
    // Token exists but is expired, so not really authenticated
    return false;
  }
  return true;
}

/**
 * Get authorization URL for OAuth flow
 * Returns the URL that the user should visit in their browser
 * Also stores the code_verifier temporarily for later use
 */
export async function getAuthorizationUrl(): Promise<string> {
  // Generate PKCE parameters using OAuth client
  const authRequest = await client.authorizationRequest({
    endpoint: `${OAUTH_BASE_URL}/oauth/authorize`,
    clientId: CLIENT_ID,
    scope: "guest_read subscription",
  });

  // Store code_verifier temporarily for later use when exchanging code
  await LocalStorage.setItem(CODE_VERIFIER_KEY, authRequest.codeVerifier);

  // Build the authorization URL with Moneytree-specific parameters
  const configsParams = new URLSearchParams({
    back_to: REDIRECT_URI,
    sdk_platform: SDK_PLATFORM,
    sdk_version: SDK_VERSION,
  });
  const configs = configsParams.toString();

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: "guest_read subscription",
    redirect_uri: REDIRECT_URI,
    code_challenge: authRequest.codeChallenge,
    code_challenge_method: "S256",
    state: authRequest.state,
    country: "JP",
    configs: configs,
    locale: "en",
  });

  return `${OAUTH_BASE_URL}/oauth/authorize?${params.toString()}`;
}

/**
 * Authenticate with an authorization code
 * This is called after the user provides the authorization code from the browser redirect
 */
export async function authenticateWithCode(authorizationCode: string): Promise<string> {
  // Retrieve the code_verifier that was stored when generating the authorization URL
  const codeVerifier = await LocalStorage.getItem<string>(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error(
      "Code verifier not found. Please start the authentication process again by getting a new authorization URL.",
    );
  }

  // Exchange authorization code for tokens
  const tokenResponse = await exchangeCodeForToken(authorizationCode, codeVerifier);

  // Store tokens using OAuth client
  await client.setTokens({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
  });

  // Clean up temporary code_verifier
  await LocalStorage.removeItem(CODE_VERIFIER_KEY);

  return tokenResponse.access_token;
}

/**
 * Extract authorization code from callback URL
 * The callback URL format is: ${APP_BASE_URL}/callback?code=XXX&state=YYY
 */
export function extractCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("code");
  } catch {
    return null;
  }
}
