/**
 * Authentication module for Odoo login and session management
 */

import { OdooClient } from "./client";
import { SessionInfo, LoginResponse, SessionExpiredError } from "./types";
import { getStorage } from "./storage";

// Storage keys
const STORAGE_KEYS = {
  SESSION: "odoo_session",
  USER_INFO: "odoo_user_info",
  ATTENDANCE_CACHE: "odoo_attendance_cache",
  TIMER_CACHE: "odoo_timer_cache",
} as const;

async function saveSession(session: SessionInfo): Promise<void> {
  console.log(`[Storage] Saving session: ${JSON.stringify(session)}`);
  await getStorage().setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

async function getSession(): Promise<SessionInfo | null> {
  const sessionStr = await getStorage().getItem(STORAGE_KEYS.SESSION);
  if (!sessionStr) {
    console.log(`[Storage] No session found in storage`);
    return null;
  }

  try {
    const session = JSON.parse(sessionStr) as SessionInfo;
    console.log(`[Storage] Loaded session from storage: ${JSON.stringify(session)}`);
    return session;
  } catch {
    console.log(`[Storage] Failed to parse session from storage`);
    return null;
  }
}

async function clearSession(): Promise<void> {
  const storage = getStorage();
  await storage.removeItem(STORAGE_KEYS.SESSION);
  await storage.removeItem(STORAGE_KEYS.USER_INFO);
  await storage.removeItem(STORAGE_KEYS.ATTENDANCE_CACHE);
  await storage.removeItem(STORAGE_KEYS.TIMER_CACHE);
}

/**
 * Fetch available databases from the Odoo server
 * Uses the /web/database/list JSON-RPC endpoint
 */
async function fetchDatabaseList(baseUrl: string): Promise<string[]> {
  const client = new OdooClient(baseUrl);
  try {
    const result = await client.request<string[]>("/web/database/list", {});
    return result || [];
  } catch {
    return [];
  }
}

/**
 * Extract database name from Odoo URL
 * For odoo.com hosted instances, queries the server for available databases
 * and matches against the subdomain. Falls back to subdomain if the endpoint
 * is unavailable. For custom domains, returns empty string to auto-detect.
 */
async function extractDatabaseName(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Check if it's an odoo.com hosted instance
    if (hostname.endsWith(".odoo.com")) {
      const subdomain = hostname.replace(/\.(dev\.)?odoo\.com$/, "");

      // Query the server for available databases
      const databases = await fetchDatabaseList(url);

      if (databases.length === 1) {
        // Only one database available — use it directly
        return databases[0];
      }

      if (databases.length > 1) {
        // Multiple databases — try to find one matching the subdomain
        const match = databases.find((db) => db.startsWith(subdomain));
        if (match) {
          return match;
        }
        // No match found, use the first database
        return databases[0];
      }

      // Endpoint unavailable or returned empty — fall back to subdomain
      return subdomain;
    }

    // For custom domains, try the database list endpoint first
    const databases = await fetchDatabaseList(url);
    if (databases.length === 1) {
      return databases[0];
    }

    // Return empty string to let Odoo auto-detect
    return "";
  } catch {
    return "";
  }
}

/**
 * Login to Odoo and save session
 */
export async function login(baseUrl: string, username: string, password: string): Promise<SessionInfo> {
  // Normalize URL
  const normalizedUrl = OdooClient.normalizeUrl(baseUrl);

  // Validate URL format
  if (!OdooClient.isValidUrl(normalizedUrl)) {
    throw new Error("Invalid Odoo URL format");
  }

  // Extract database name from URL (queries server for available databases)
  const dbName = await extractDatabaseName(normalizedUrl);

  // Create client without session for login
  const client = new OdooClient(normalizedUrl);

  try {
    // Attempt login
    const response = await client.request<LoginResponse["result"]>("/web/session/authenticate", {
      db: dbName,
      login: username,
      password: password,
    });

    // Check if login was successful
    if (!response || !response.uid) {
      throw new Error("Invalid username or password");
    }

    // Extract session information including cookies
    const capturedCookies = client.getCookies();
    console.log(`[Auth] Captured cookies after login: ${JSON.stringify(capturedCookies)}`);
    console.log(`[Auth] Session ID from response: ${response.session_id}`);

    // Extract session_id from cookies if not in response
    let sessionId = response.session_id;
    if (!sessionId && capturedCookies.length > 0) {
      const sessionCookie = capturedCookies.find((c) => c.startsWith("session_id="));
      if (sessionCookie) {
        sessionId = sessionCookie.split("=")[1];
        console.log(`[Auth] Extracted session ID from cookie: ${sessionId}`);
      }
    }

    const sessionInfo: SessionInfo = {
      sessionId: sessionId || "",
      baseUrl: normalizedUrl,
      userId: response.uid,
      companyId: response.company_id,
      employeeId: 0, // Will be populated by getting employee info
      employeeName: response.name || username,
      username: response.username || username,
      cookies: capturedCookies, // Get cookies from the client
    };

    // Try to get employee information
    try {
      client.setSession(sessionId || "", capturedCookies);
      console.log(`[Auth] Set session on client. SessionID: ${client.getSession()}`);
      const employeeData = await client.callKw<{ id: number; name: string }[]>(
        "hr.employee",
        "search_read",
        [[["user_id", "=", response.uid]]], // Domain as first positional argument
        {
          fields: ["id", "name"],
          limit: 1,
        },
      );

      if (employeeData && employeeData.length > 0) {
        sessionInfo.employeeId = employeeData[0].id;
        sessionInfo.employeeName = employeeData[0].name;
      }
    } catch (error) {
      // If we can't get employee info, that's okay - continue with login
      console.error("Could not fetch employee info:", error);
    }

    // Save session to storage
    await saveSession(sessionInfo);

    return sessionInfo;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Login failed: ${error.message}`);
    }
    throw new Error("Login failed: Unknown error");
  }
}

/**
 * Get stored session and validate it's still active
 */
export async function getStoredSession(): Promise<SessionInfo | null> {
  return await getSession();
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<void> {
  const session = await getSession();

  if (session) {
    try {
      // Attempt to call logout endpoint
      const client = new OdooClient(session.baseUrl, session.sessionId, session.cookies || []);
      await client.request("/web/session/destroy", {});
    } catch (error) {
      // If logout request fails, still clear local session
      console.error("Logout request failed:", error);
    }
  }

  // Clear local session data
  await clearSession();
}

/**
 * Create an authenticated client from stored session
 */
export async function getAuthenticatedClient(): Promise<OdooClient> {
  const session = await getSession();

  if (!session) {
    throw new SessionExpiredError("No active session found");
  }

  console.log(`[Auth] Creating client with session ID: ${session.sessionId}`);
  console.log(`[Auth] Creating client with cookies: ${JSON.stringify(session.cookies)}`);

  return new OdooClient(session.baseUrl, session.sessionId, session.cookies || []);
}

/**
 * Check if user has an active session
 */
export async function hasActiveSession(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
