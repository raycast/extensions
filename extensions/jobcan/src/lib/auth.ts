/**
 * Authentication Module for Jobcan Extension
 *
 * This module implements session-based authentication using cookies.
 * The flow uses OAuth under the hood but establishes a session cookie (sid) for authenticated requests.
 *
 * ## Flow Overview
 *
 * 1. **Login (Automated)**
 *    - User provides email and password via extension preferences
 *    - Fetch login page to extract CSRF token (authenticity_token)
 *    - POST credentials to sign_in endpoint
 *    - GET OAuth authorize endpoint to get authorization code
 *    - GET callback endpoint to establish session cookies
 *    - Store `sid` cookie in LocalStorage
 *
 * 2. **Session Management**
 *    - Session cookie stored in LocalStorage with expiry timestamp
 *    - Automatic re-login when session expires (if enabled)
 *    - Session validation before each API request
 *
 * 3. **Logout**
 *    - Clear session cookie from LocalStorage
 *    - Clear cached data
 *    - Call logout endpoint
 */

import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { ID_BASE_URL, SSL_BASE_URL, REDIRECT_URI, CLIENT_ID, STORAGE_KEYS, CACHE_TTL } from "./constants";
import { SessionData } from "./types";
import { clearCache } from "./cache";

// Preferences interface
interface Preferences {
  email: string;
  password: string;
  autoReloginOnRefreshFailure: boolean;
}

/**
 * Get preferences from Raycast
 */
function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Extract authenticity token (CSRF token) from login page HTML
 */
function extractAuthenticityToken(html: string): string | null {
  // Look for: <input name="authenticity_token" value="..." />
  const inputMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
  if (inputMatch) {
    return inputMatch[1];
  }

  // Alternative: <meta name="csrf-token" content="..." />
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
 * Parse a cookie string (either Set-Cookie header or cookie string) into name=value pairs
 */
function parseCookieString(cookieInput: string): string {
  // If it looks like a Set-Cookie header (has path=, secure, etc.), extract just the name=value
  if (cookieInput.includes("path=") || cookieInput.includes("secure") || cookieInput.includes("HttpOnly")) {
    return parseCookies(cookieInput);
  }
  // Otherwise, it's already a cookie string, return as-is
  return cookieInput;
}

/**
 * Merge cookies from multiple Set-Cookie headers or cookie strings
 */
function mergeCookies(...cookieHeaders: (string | null)[]): string {
  const allCookies: Record<string, string> = {};

  for (const header of cookieHeaders) {
    if (header) {
      const cookies = parseCookieString(header);
      if (cookies) {
        // Parse each cookie and merge
        cookies.split("; ").forEach((cookie) => {
          const [name, value] = cookie.split("=");
          if (name && value) {
            allCookies[name] = value;
          }
        });
      }
    }
  }

  return Object.entries(allCookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

/**
 * Extract authorization code from redirect URL
 */
function extractCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("code");
  } catch {
    return null;
  }
}

/**
 * Extract session cookie (sid) from Set-Cookie header
 */
function extractSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookies(cookieHeader);
  const sidMatch = cookies.match(/sid=([^;]+)/);
  return sidMatch ? sidMatch[1] : null;
}

/**
 * Store session data in LocalStorage
 */
async function storeSession(sid: string, allCookies: string): Promise<void> {
  const expiry = Date.now() + CACHE_TTL.SESSION; // 24 hours from now
  await LocalStorage.setItem(STORAGE_KEYS.SESSION_COOKIE, sid);
  await LocalStorage.setItem(STORAGE_KEYS.SESSION_COOKIES, allCookies);
  await LocalStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
}

/**
 * Get stored session data
 */
async function getStoredSession(): Promise<SessionData | null> {
  const sid = await LocalStorage.getItem<string>(STORAGE_KEYS.SESSION_COOKIE);
  const cookies = await LocalStorage.getItem<string>(STORAGE_KEYS.SESSION_COOKIES);
  const expiryStr = await LocalStorage.getItem<string>(STORAGE_KEYS.SESSION_EXPIRY);

  if (!sid || !cookies || !expiryStr) {
    return null;
  }

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || expiry < Date.now()) {
    // Session expired
    await clearStoredSession();
    return null;
  }

  return { sid, cookies, expiry };
}

/**
 * Clear stored session data
 */
export async function clearStoredSession(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.SESSION_COOKIE);
  await LocalStorage.removeItem(STORAGE_KEYS.SESSION_COOKIES);
  await LocalStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
}

/**
 * Automated login flow using email and password
 * This performs the entire OAuth flow programmatically:
 * 1. Get CSRF token from login page
 * 2. POST login credentials to establish session
 * 3. GET OAuth authorize endpoint to get authorization code
 * 4. GET callback to establish session cookies
 */
export async function login(email: string, password: string): Promise<string> {
  console.debug("[Auth] Starting login flow...");
  // Step 1: Get login page to extract CSRF token
  const loginPageUrl = `${ID_BASE_URL}/users/sign_in`;
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
    "user[email]": email,
    "user[client_code]": "",
    "user[password]": password,
    redirect_uri: REDIRECT_URI,
    app_key: "atd",
    commit: "Login",
  });

  const loginResponse = await fetch(loginPageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: loginPageCookies,
      Origin: ID_BASE_URL,
      Referer: loginPageUrl,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
    redirect: "manual", // Don't follow redirects automatically
    body: loginFormData.toString(),
  });

  // Get updated cookies from login response
  const loginCookies = mergeCookies(loginPageCookies, loginResponse.headers.get("set-cookie"));

  // Check if login was successful (should redirect or return 200)
  if (loginResponse.status !== 302 && loginResponse.status !== 200) {
    const errorText = await loginResponse.text();
    console.debug(`[Auth] Login failed with status ${loginResponse.status}`);
    throw new Error(
      `Login failed: ${loginResponse.status}. Check your email and password. ${errorText.substring(0, 200)}`,
    );
  }

  // Step 3: Get authorization code via OAuth authorize endpoint
  const authorizeParams = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "read",
  });

  const authorizeUrl = `${ID_BASE_URL}/oauth/authorize?${authorizeParams.toString()}`;
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
  const authorizeLocation = authorizeResponse.headers.get("location");
  if (!authorizeLocation) {
    throw new Error("Authorization failed: No redirect location received");
  }

  // Extract authorization code from redirect URL
  const code = extractCodeFromUrl(authorizeLocation);
  if (!code) {
    throw new Error(`Failed to extract authorization code from redirect: ${authorizeLocation}`);
  }

  // Step 4: Get callback to establish session cookies
  const callbackUrl = `${SSL_BASE_URL}/jbcoauth/callback?code=${code}`;
  const callbackCookies = mergeCookies(loginCookies, authorizeResponse.headers.get("set-cookie"));

  const callbackResponse = await fetch(callbackUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: callbackCookies,
      Referer: ID_BASE_URL,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
    redirect: "manual",
  });

  const callbackLocation = callbackResponse.headers.get("location");

  // Extract session cookie (sid) from callback response
  let allCallbackCookies = mergeCookies(
    loginCookies,
    authorizeResponse.headers.get("set-cookie"),
    callbackResponse.headers.get("set-cookie"),
  );

  let sid = extractSessionCookie(allCallbackCookies);

  if (!sid) {
    // Try to extract from Set-Cookie header directly
    const setCookieHeader = callbackResponse.headers.get("set-cookie");
    console.debug(`[Auth] Trying to extract sid from Set-Cookie header directly: ${setCookieHeader || "none"}`);
    sid = extractSessionCookie(setCookieHeader);
    if (!sid) {
      console.debug(`[Auth] Failed to extract sid from callback response`);
      throw new Error("Failed to extract session cookie from callback response");
    }
    console.debug(`[Auth] Extracted sid from Set-Cookie header: ${sid.substring(0, 10)}...`);
  }

  // Step 5: Follow the redirect to /employee to fully establish the session
  if (callbackLocation) {
    console.debug(`[Auth] Step 5: Following redirect to establish session...`);
    let currentUrl = callbackLocation.startsWith("http") ? callbackLocation : `${SSL_BASE_URL}${callbackLocation}`;
    console.debug(`[Auth] Initial redirect URL: ${currentUrl}`);

    // Use ALL cookies from the callback, not just sid
    // Merge with standard employee cookies
    let currentCookies = mergeCookies(allCallbackCookies, "employee_language=en; __bd_fedee=1");
    // Ensure sid is included (in case it wasn't in allCallbackCookies)
    if (!currentCookies.includes("sid=")) {
      currentCookies = mergeCookies(currentCookies, `sid=${sid}`);
    }

    let redirectCount = 0;
    const maxRedirects = 5;

    // Follow redirects until we get a 200 response
    while (redirectCount < maxRedirects) {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: currentCookies,
          Referer: redirectCount === 0 ? callbackUrl : currentUrl,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        },
        redirect: "manual",
      });

      // Update cookies from response - merge with existing cookies
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        currentCookies = mergeCookies(currentCookies, setCookieHeader);
        const newSid = extractSessionCookie(setCookieHeader);
        if (newSid) {
          sid = newSid;
        }
      }

      // If we got a 200, check if it's a valid employee page
      if (response.status === 200) {
        const html = await response.text();
        const isEmployeePage =
          html.includes("jbc-container") || html.includes("Attendance Book") || html.includes("JOBCAN MyPage");
        // More specific login page detection - check for actual login form elements
        const isLoginPage =
          html.includes('id="login-contents"') ||
          html.includes('action="/users/sign_in"') ||
          (html.includes("/users/sign_in") && html.includes('type="password"')) ||
          currentUrl.includes("/users/sign_in") ||
          currentUrl.includes("/login/pc-employee-global");
        // Only fail if it's definitely a login page AND not an employee page
        if (isLoginPage && !isEmployeePage) {
          throw new Error("Redirected to login page - session establishment failed");
        }
        if (!isEmployeePage) {
          console.debug(`[Auth] Warning: Got 200 but page doesn't look like employee page`);
        }
        break;
      }

      // If we got a redirect, follow it
      if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        const location = response.headers.get("location");
        if (location) {
          // Check if redirecting to login page - this means session failed
          if (location.includes("sign_in") || location.includes("login")) {
            throw new Error("Redirected to login page - session establishment failed");
          }

          // Handle relative URLs
          if (location.startsWith("http")) {
            currentUrl = location;
          } else if (location.startsWith("/")) {
            currentUrl = `${SSL_BASE_URL}${location}`;
          } else {
            // Relative path - resolve against current URL
            const urlObj = new URL(currentUrl);
            urlObj.pathname = location;
            currentUrl = urlObj.toString();
          }
          redirectCount++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (redirectCount >= maxRedirects) {
      console.debug(`[Auth] Warning: Reached max redirects (${maxRedirects})`);
    }

    // Use the final cookies after following redirects
    allCallbackCookies = currentCookies;
  }

  // Store all cookies, not just sid
  await storeSession(sid, allCallbackCookies);
  console.debug(`[Auth] Login successful - session established (sid: ${sid.substring(0, 10)}...)`);
  return sid;
}

/**
 * Get session cookie for authenticated requests
 */
export async function getSessionCookie(): Promise<string> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error("No valid session found. Please login.");
  }
  return session.sid;
}

/**
 * Get all session cookies for authenticated requests
 */
export async function getSessionCookies(): Promise<string> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error("No valid session found. Please login.");
  }
  // Merge with standard employee cookies
  return mergeCookies(session.cookies, "employee_language=en; __bd_fedee=1");
}

/**
 * Ensure we have a valid session, re-login if necessary
 */
export async function ensureValidSession(): Promise<string> {
  const session = await getStoredSession();
  const preferences = getPreferences();

  if (!session) {
    console.debug("[Auth] No session found");
    // No session found, attempt auto-login if preferences are set
    if (preferences.autoReloginOnRefreshFailure && preferences.email && preferences.password) {
      console.debug("[Auth] Attempting auto-login with stored credentials");
      try {
        const sid = await login(preferences.email, preferences.password);
        return sid;
      } catch {
        throw new Error(
          "Authentication failed. Please check your email and password in extension preferences or update them if they have changed.",
        );
      }
    }
    throw new Error(
      "You're logged out. Please set your email and password or make sure auto re-login is enabled in extension preferences.",
    );
  }

  // Check if session is expired (with 5 minute buffer)
  const now = Date.now();
  const timeUntilExpiry = session.expiry - now;
  const minutesUntilExpiry = Math.floor(timeUntilExpiry / 1000 / 60);

  if (timeUntilExpiry < 5 * 60 * 1000) {
    // Session expires soon or expired, attempt re-login if enabled
    console.debug(`[Auth] Session expired or expiring soon (${minutesUntilExpiry} min), attempting re-login`);
    if (preferences.autoReloginOnRefreshFailure && preferences.email && preferences.password) {
      try {
        const sid = await login(preferences.email, preferences.password);
        return sid;
      } catch {
        throw new Error(
          "Session expired and auto-relogin failed. Please check your credentials in extension preferences.",
        );
      }
    }
    throw new Error(
      "Session expired and auto-relogin is disabled. Please enable auto-relogin or update your credentials in extension preferences.",
    );
  }

  // Only log session status if it's getting close to expiry (less than 60 minutes) or if debugging
  if (minutesUntilExpiry < 60) {
    console.debug(`[Auth] Session status: expires in ${minutesUntilExpiry} minutes`);
  }

  return session.sid;
}

/**
 * Check if user is authenticated (has valid session)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getStoredSession();
  if (!session) {
    return false;
  }
  // Check if session is expired (with buffer)
  if (session.expiry < Date.now() + 5 * 60 * 1000) {
    return false;
  }
  return true;
}

/**
 * Logout - clear session and cache
 */
export async function logout(): Promise<void> {
  console.debug("[Auth] logout() - Starting logout process");

  // Get session cookie for logout request
  const session = await getStoredSession();
  if (session) {
    try {
      // Call logout endpoint
      await fetch(`${SSL_BASE_URL}/employee/logout/`, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: `employee_language=en; __bd_fedee=1; sid=${session.sid}`,
          Referer: `${SSL_BASE_URL}/employee`,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        },
      });
    } catch (error) {
      console.debug("[Auth] Logout endpoint call failed (non-critical):", error);
    }
  }

  // Clear all cached data
  console.debug("[Auth] logout() - Clearing cache");
  clearCache();

  // Clear session data
  console.debug("[Auth] logout() - Clearing session");
  await clearStoredSession();

  console.debug("[Auth] logout() - Logout complete");
}
