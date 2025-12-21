import {
  getBackendUrl,
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  getStoredCSRFToken,
  setStoredCSRFToken,
  clearStoredCSRFToken,
  getStoredCredentials,
  setStoredCredentials,
  clearStoredCredentials,
} from "../config";
import { LoginResponse, CSRFResponse } from "../types";

export async function getCSRFToken(): Promise<string> {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/auth/csrf`;
  console.log("[AUTH] Getting CSRF token from:", url);
  console.log("[AUTH] Backend URL value:", backendUrl);

  if (!backendUrl || !backendUrl.startsWith("http")) {
    const error = `Invalid backend URL: "${backendUrl}". Please configure a valid URL in Raycast preferences.`;
    console.error("[AUTH]", error);
    throw new Error(error);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    console.log("[AUTH] CSRF response status:", response.status, response.statusText);
    console.log("[AUTH] CSRF response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error("[AUTH] Failed to get CSRF token:", response.status, response.statusText);
      const errorText = await response.text().catch(() => "");
      console.error("[AUTH] CSRF error response body:", errorText);
      throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as CSRFResponse;
    console.log("[AUTH] CSRF token received:", data.csrfToken.substring(0, 8) + "...");

    // Store the CSRF token so we can send it as a cookie in the login request
    // The backend sets it as a cookie, but we need to manually send it since Raycast doesn't handle cookies automatically
    await setStoredCSRFToken(data.csrfToken);
    console.log("[AUTH] CSRF token stored");

    return data.csrfToken;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      const errorMsg = `Failed to connect to backend at "${url}". Please check:\n1. Backend URL is correct in Raycast preferences\n2. Backend server is running\n3. URL is accessible (e.g., http://localhost:3000)`;
      console.error("[AUTH] Network error:", errorMsg);
      console.error("[AUTH] Original error:", error);
      throw new Error(errorMsg);
    }
    throw error;
  }
}

export async function login(
  username: string,
  password: string,
  csrfToken: string,
): Promise<{ success: boolean; sessionId?: string }> {
  const backendUrl = getBackendUrl();
  console.log("[AUTH] Attempting login for user:", username);
  console.log("[AUTH] Backend URL:", backendUrl);
  console.log("[AUTH] CSRF token (first 8 chars):", csrfToken.substring(0, 8) + "...");

  // The backend requires both X-CSRF-Token header AND csrf_token cookie
  // Since Raycast doesn't handle cookies automatically, we need to extract the cookie from Set-Cookie
  // and send it manually. However, we can't read Set-Cookie headers in Raycast.
  // So we'll send the CSRF token we stored, and the backend should accept it if cookies work.
  // If not, we'll need to use manual session entry.

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };

  // Try to include the CSRF token as a cookie header (some backends accept this)
  // Format: Cookie: csrf_token=<token>
  const csrfCookieValue = await getStoredCSRFToken();
  if (csrfCookieValue) {
    headers["Cookie"] = `csrf_token=${csrfCookieValue}`;
    console.log("[AUTH] Added CSRF cookie to headers");
  } else {
    console.warn("[AUTH] No stored CSRF cookie value found");
  }

  console.log("[AUTH] Login request headers:", Object.keys(headers));
  console.log("[AUTH] Sending login request to:", `${backendUrl}/api/auth/login`);

  const response = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });

  console.log("[AUTH] Login response status:", response.status, response.statusText);
  console.log("[AUTH] Login response headers:", Object.fromEntries(response.headers.entries()));

  const data = (await response.json()) as LoginResponse;
  console.log("[AUTH] Login response data:", data);

  if (!response.ok) {
    console.error("[AUTH] Login failed:", data.error || response.statusText);
    throw new Error(data.error || `Login failed: ${response.statusText}`);
  }

  // Try to extract JSESSIONID from Set-Cookie header
  // In browsers, we could read response.headers.get('set-cookie'), but Raycast's fetch
  // might not expose this. Let's try to parse it if available.
  const setCookieHeader = response.headers.get("set-cookie");
  console.log("[AUTH] Set-Cookie header:", setCookieHeader);

  let jsessionId: string | null = null;

  if (setCookieHeader) {
    // Parse Set-Cookie header: JSESSIONID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX; Path=/...
    const match = setCookieHeader.match(/JSESSIONID=([^;]+)/);
    if (match && match[1]) {
      jsessionId = match[1];
      console.log("[AUTH] Extracted JSESSIONID:", jsessionId.substring(0, 8) + "...");
      await setStoredSession(jsessionId);
      console.log("[AUTH] JSESSIONID stored");
    } else {
      console.warn("[AUTH] Could not parse JSESSIONID from Set-Cookie header");
    }
  } else {
    console.warn("[AUTH] No Set-Cookie header found in response");
  }

  // If we couldn't extract the session ID, we'll need to verify it works
  // by making a test API call, or the user will need to use manual entry
  console.log("[AUTH] Login successful, sessionId extracted:", !!jsessionId);

  // Store credentials for automatic re-login on session expiration
  await setStoredCredentials({ username, password });
  console.log("[AUTH] Credentials stored for auto-relogin");

  return { success: true, sessionId: jsessionId || undefined };
}

/**
 * Automatically re-login using stored credentials when session expires
 */
export async function autoRelogin(): Promise<boolean> {
  console.log("[AUTH] Attempting automatic re-login...");

  const credentials = await getStoredCredentials();
  if (!credentials) {
    console.log("[AUTH] No stored credentials found for auto-relogin");
    return false;
  }

  try {
    console.log("[AUTH] Found stored credentials, attempting login...");
    const csrfToken = await getCSRFToken();
    const loginResult = await login(credentials.username, credentials.password, csrfToken);

    if (loginResult.success) {
      console.log("[AUTH] Auto-relogin successful");
      return true;
    }

    console.warn("[AUTH] Auto-relogin failed - login returned success=false");
    return false;
  } catch (error) {
    console.error("[AUTH] Auto-relogin failed:", error);
    // Clear invalid credentials
    await clearStoredCredentials();
    return false;
  }
}

export async function logout(): Promise<void> {
  const backendUrl = getBackendUrl();
  const sessionId = await getStoredSession();
  console.log("[AUTH] Logging out, sessionId exists:", !!sessionId);

  const headers: Record<string, string> = {};

  if (sessionId) {
    headers["X-Session-Cookie"] = sessionId;
    // Also try sending as Cookie header
    headers["Cookie"] = `JSESSIONID=${sessionId}`;
    console.log("[AUTH] Added session headers for logout");
  } else {
    console.warn("[AUTH] No session ID found for logout");
  }

  console.log("[AUTH] Sending logout request to:", `${backendUrl}/api/auth/logout`);
  const response = await fetch(`${backendUrl}/api/auth/logout`, {
    method: "POST",
    headers,
    credentials: "include",
  });

  console.log("[AUTH] Logout response status:", response.status, response.statusText);

  await clearStoredSession();
  await clearStoredCSRFToken();
  await clearStoredCredentials();
  console.log("[AUTH] Cleared stored session, CSRF token, and credentials");
}

export async function setSession(jsessionId: string): Promise<void> {
  const backendUrl = getBackendUrl();
  console.log("[AUTH] Setting session manually");
  console.log("[AUTH] JSESSIONID (first 8 chars):", jsessionId.substring(0, 8) + "...");
  console.log("[AUTH] Backend URL:", backendUrl);

  const response = await fetch(`${backendUrl}/api/auth/set-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ jsessionId }),
  });

  console.log("[AUTH] Set-session response status:", response.status, response.statusText);
  console.log("[AUTH] Set-session response headers:", Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    console.error("[AUTH] Failed to set session:", data.error || response.statusText);
    throw new Error(data.error || `Failed to set session: ${response.statusText}`);
  }

  // Store the session ID for future requests
  await setStoredSession(jsessionId);
  console.log("[AUTH] Session stored successfully");
}
