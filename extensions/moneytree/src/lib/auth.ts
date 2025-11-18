import { getPreferenceValues } from "@raycast/api";
import { createHash, randomBytes } from "crypto";
import { OAuthTokenResponse } from "./types";
import { CLIENT_ID, REDIRECT_URI, OAUTH_BASE_URL, SDK_PLATFORM, SDK_VERSION } from "./constants";
import { getStoredTokens, saveTokens, clearTokens, isTokenExpired } from "./storage";

interface Preferences {
  email: string;
  password: string;
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Generate a random code verifier (43-128 characters, URL-safe)
  const codeVerifier = randomBytes(32).toString("base64url");

  // Create code challenge by hashing the verifier with SHA256 and base64url encoding
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  return { codeVerifier, codeChallenge };
}

/**
 * Get email and password from Raycast preferences
 */
export function getCredentials(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  return {
    email: preferences.email,
    password: preferences.password,
  };
}

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
      Origin: "https://app.getmoneytree.com",
      Referer: "https://app.getmoneytree.com/",
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
      Origin: "https://app.getmoneytree.com",
      Referer: "https://app.getmoneytree.com/",
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
 * If no tokens exist, automatically authenticate using email/password from preferences
 */
export async function ensureValidToken(): Promise<string> {
  const stored = await getStoredTokens();

  if (!stored) {
    // No tokens found, try to authenticate automatically
    try {
      return await authenticate();
    } catch (error) {
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}. ` +
          "Please check your email and password in Raycast preferences.",
      );
    }
  }

  // Check if token is expired (with 5 minute buffer)
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  if (isTokenExpired(stored.expires_at - bufferTime)) {
    try {
      // Refresh the token
      const tokenResponse = await refreshAccessToken(stored.refresh_token);
      await saveTokens(
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_in,
        tokenResponse.created_at,
        stored.code_verifier,
      );
      return tokenResponse.access_token;
    } catch {
      // If refresh fails, clear tokens and try to re-authenticate
      await clearTokens();
      try {
        return await authenticate();
      } catch (authError) {
        throw new Error(
          `Token refresh failed and re-authentication failed: ${authError instanceof Error ? authError.message : "Unknown error"}. ` +
            "Please check your email and password in Raycast preferences.",
        );
      }
    }
  }

  return stored.access_token;
}

/**
 * Get a valid access token (main entry point)
 * This will check expiration and refresh if needed
 */
export async function getAccessToken(): Promise<string> {
  return ensureValidToken();
}

/**
 * Authenticate with an authorization code (manual entry fallback)
 * This can be used if you have an authorization code from another source
 */
export async function authenticateWithCode(authorizationCode: string, codeVerifier?: string): Promise<string> {
  // Generate PKCE parameters if not provided
  let verifier = codeVerifier;
  if (!verifier) {
    const pkce = generatePKCE();
    verifier = pkce.codeVerifier;
  }

  // Exchange authorization code for tokens
  const tokenResponse = await exchangeCodeForToken(authorizationCode, verifier);

  // Save tokens
  await saveTokens(
    tokenResponse.access_token,
    tokenResponse.refresh_token,
    tokenResponse.expires_in,
    tokenResponse.created_at,
    verifier,
  );

  return tokenResponse.access_token;
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
function buildAuthorizeUrl(codeChallenge: string): string {
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
    state: JSON.stringify({ path: "/callback?action=logout" }),
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
 * Extract authorization code from callback URL
 * The callback URL format is: https://app.getmoneytree.com/callback?code=XXX&state=YYY
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
 * Authenticate with email and password
 *
 * Flow:
 * 1. GET /guests/login to get CSRF token
 * 2. POST /guests/login with email/password
 * 3. GET /oauth/authorize with PKCE to get authorization code
 * 4. Extract code from redirect and exchange for tokens
 */
export async function authenticate(): Promise<string> {
  const { email, password } = getCredentials();

  if (!email || !password) {
    throw new Error("Email and password must be set in Raycast preferences");
  }

  // Generate PKCE parameters
  const { codeVerifier, codeChallenge } = generatePKCE();

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
  const cookies = loginPageResponse.headers.get("set-cookie") || "";

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
      Cookie: cookies,
      Origin: OAUTH_BASE_URL,
      Referer: loginPageUrl,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
    redirect: "manual", // Don't follow redirects automatically
    body: loginFormData.toString(),
  });

  // Get updated cookies from login response
  const loginCookies = loginResponse.headers.get("set-cookie") || cookies;
  const combinedCookies = loginCookies ? `${cookies}; ${loginCookies}` : cookies;

  // Check if login was successful (should redirect)
  if (loginResponse.status !== 302 && loginResponse.status !== 200) {
    const errorText = await loginResponse.text();
    throw new Error(`Login failed: ${loginResponse.status}. Check your email and password. ${errorText}`);
  }

  // Step 3: Get authorization code via OAuth authorize endpoint
  const authorizeUrl = buildAuthorizeUrl(codeChallenge);
  const authorizeResponse = await fetch(authorizeUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: combinedCookies,
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

  // Save tokens
  await saveTokens(
    tokenResponse.access_token,
    tokenResponse.refresh_token,
    tokenResponse.expires_in,
    tokenResponse.created_at,
    codeVerifier,
  );

  return tokenResponse.access_token;
}
