/**
 * Authentication Module for Moneytree Extension
 *
 * This module implements OAuth 2.0 with PKCE (Proof Key for Code Exchange) authentication
 * for the Moneytree API, with an automated login flow using email/password.
 *
 * ## Architecture
 *
 * The authentication system uses a hybrid approach:
 * - Raycast's OAuth.PKCEClient for PKCE generation and secure token storage
 * - Custom automated login flow to handle Moneytree's session-based OAuth
 *
 * ## Flow Overview
 *
 * 1. **Login (Automated)**
 *    - User provides email and password via form
 *    - Fetch login page to extract CSRF token
 *    - POST credentials to establish session with cookies
 *    - GET OAuth authorize endpoint with PKCE challenge
 *    - Extract authorization code from redirect
 *    - Exchange code for access/refresh tokens
 *    - Store tokens securely using OAuth.PKCEClient
 *
 * 2. **Token Management**
 *    - Tokens stored encrypted in system Keychain (macOS) or Credential Manager (Windows)
 *    - Automatic token refresh when expired
 *    - Token validation before each API request
 *
 * 3. **Logout**
 *    - Clear all tokens from secure storage
 *    - Clear cached data
 *    - Verify tokens are removed
 *
 * ## Key Functions
 *
 * - `login(email, password)` - Automated login flow
 * - `logout()` - Clear all authentication data
 * - `isAuthenticated()` - Check if valid tokens exist
 * - `getAccessToken()` - Get valid access token (with auto-refresh)
 * - `ensureValidToken()` - Validate and refresh token if needed
 *
 * ## Security Notes
 *
 * - Email/password are NEVER stored (ephemeral input only)
 * - Only OAuth tokens are persisted (encrypted)
 * - PKCE prevents authorization code interception
 * - Direct communication with Moneytree servers only
 */

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
      "No authentication tokens found. Please use the 'Login' command to connect your Moneytree account.",
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
      throw new Error("Token refresh failed. Please use the 'Login' command to reconnect your Moneytree account.");
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
  console.debug("[Auth] logout() - Starting logout process");

  console.debug("[Auth] logout() - Removing tokens from OAuth client");
  await client.removeTokens();

  // Also clear any temporary code_verifier
  console.debug("[Auth] logout() - Clearing temporary code_verifier");
  await LocalStorage.removeItem(CODE_VERIFIER_KEY);

  // Clear all cached data
  console.debug("[Auth] logout() - Clearing cache");
  clearCache();

  // Wait longer to ensure token removal is fully processed
  // OAuth client token storage may be async and needs time to persist
  console.debug("[Auth] logout() - Waiting 250ms for token removal to process");
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Verify tokens are actually cleared
  console.debug("[Auth] logout() - Verifying tokens are cleared");
  const tokenSet = await client.getTokens();
  if (tokenSet !== null) {
    console.debug("[Auth] Warning: Tokens still exist after logout, attempting force clear");
    // Force clear by trying again
    await client.removeTokens();
    // Wait longer after force clear
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Final verification
    const finalTokenSet = await client.getTokens();
    if (finalTokenSet !== null) {
      console.debug("[Auth] Error: Tokens still exist after force clear");
    } else {
      console.debug("[Auth] logout() - Force clear successful");
    }
  } else {
    console.debug("[Auth] logout() - Tokens successfully cleared");
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

/**
 * Build the login page URL to get the CSRF token
 */
function buildLoginPageUrl(): string {
  const configsParams = new URLSearchParams({
    back_to: REDIRECT_URI,
    sdk_platform: SDK_PLATFORM,
    sdk_version: SDK_VERSION,
  });
  const configs = configsParams.toString();

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    configs: configs,
    country: "JP",
    locale: "en",
    state: JSON.stringify({ path: "/callback?action=logout" }),
  });

  return `${OAUTH_BASE_URL}/guests/login?${params.toString()}`;
}

/**
 * Build the OAuth authorize URL with PKCE parameters
 */
function buildAuthorizeUrl(codeChallenge: string, state: string): string {
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
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: state,
    country: "JP",
    configs: configs,
    locale: "en",
  });

  return `${OAUTH_BASE_URL}/oauth/authorize?${params.toString()}`;
}

/**
 * Extract authenticity token (CSRF token) from login page HTML
 */
function extractAuthenticityToken(html: string): string | null {
  // Look for: <input name="authenticity_token" value="..." />
  // or: <meta name="csrf-token" content="..." />
  const inputMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
  if (inputMatch) {
    return inputMatch[1];
  }

  const metaMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/);
  if (metaMatch) {
    return metaMatch[1];
  }

  return null;
}

/**
 * Parse cookies from Set-Cookie header
 */
function parseCookies(setCookieHeader: string | null): string {
  if (!setCookieHeader) {
    return "";
  }

  // Extract cookie name=value pairs from Set-Cookie headers
  const cookies: string[] = [];
  const cookieStrings = setCookieHeader.split(/,\s*(?=\w+=)/);

  for (const cookieString of cookieStrings) {
    // Extract the name=value part (before the first semicolon)
    const match = cookieString.match(/^([^;]+)/);
    if (match) {
      cookies.push(match[1].trim());
    }
  }

  return cookies.join("; ");
}

/**
 * Merge cookies from multiple Set-Cookie headers
 */
function mergeCookies(...cookieHeaders: (string | null)[]): string {
  const allCookies: string[] = [];

  for (const header of cookieHeaders) {
    if (header) {
      const cookies = parseCookies(header);
      if (cookies) {
        allCookies.push(cookies);
      }
    }
  }

  return allCookies.join("; ");
}

/**
 * Automated login flow using email and password
 * This performs the entire OAuth flow programmatically:
 * 1. Get CSRF token from login page
 * 2. POST login credentials to establish session
 * 3. GET OAuth authorize endpoint to get authorization code
 * 4. Exchange code for tokens
 */
export async function login(email: string, password: string): Promise<string> {
  // Generate PKCE parameters using OAuth client
  const authRequest = await client.authorizationRequest({
    endpoint: `${OAUTH_BASE_URL}/oauth/authorize`,
    clientId: CLIENT_ID,
    scope: "guest_read subscription",
  });

  const { codeVerifier, codeChallenge } = {
    codeVerifier: authRequest.codeVerifier,
    codeChallenge: authRequest.codeChallenge,
  };

  // Step 1: Get login page to extract CSRF token
  const loginPageUrl = buildLoginPageUrl();
  const loginPageResponse = await fetch(loginPageUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
  });

  if (!loginPageResponse.ok) {
    throw new Error(`Failed to load login page: ${loginPageResponse.status}`);
  }

  const loginPageHtml = await loginPageResponse.text();
  const authenticityToken = extractAuthenticityToken(loginPageHtml);

  if (!authenticityToken) {
    throw new Error("Failed to extract CSRF token from login page");
  }

  // Extract cookies from the response for session management
  const loginPageCookies = mergeCookies(loginPageResponse.headers.get("set-cookie"));

  // Step 2: POST login credentials
  const loginFormData = new URLSearchParams({
    authenticity_token: authenticityToken,
    "guest[email]": email,
    "guest[password]": password,
    "guest[remember_me]": "1",
  });

  const loginResponse = await fetch(loginPageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: loginPageCookies,
      Origin: OAUTH_BASE_URL,
      Referer: loginPageUrl,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
    redirect: "manual", // Don't follow redirects automatically
    body: loginFormData.toString(),
  });

  // Get updated cookies from login response
  const loginCookies = mergeCookies(loginPageCookies, loginResponse.headers.get("set-cookie"));

  // Check if login was successful (should redirect)
  if (loginResponse.status !== 302 && loginResponse.status !== 200) {
    const errorText = await loginResponse.text();
    throw new Error(
      `Login failed: ${loginResponse.status}. Check your email and password. ${errorText.substring(0, 200)}`,
    );
  }

  // Step 3: Get authorization code via OAuth authorize endpoint
  const authorizeUrl = buildAuthorizeUrl(codeChallenge, authRequest.state);
  const authorizeResponse = await fetch(authorizeUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: loginCookies,
      Referer: loginPageUrl,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
    redirect: "manual",
  });

  // The authorize endpoint should redirect to callback with code
  const location = authorizeResponse.headers.get("location");
  if (!location) {
    throw new Error("Authorization failed: No redirect location received");
  }

  // Extract authorization code from redirect URL
  const code = extractCodeFromUrl(location);
  if (!code) {
    throw new Error(`Failed to extract authorization code from redirect: ${location}`);
  }

  // Step 4: Exchange authorization code for tokens
  const tokenResponse = await exchangeCodeForToken(code, codeVerifier);

  // Store tokens using OAuth client
  await client.setTokens({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
  });

  return tokenResponse.access_token;
}
