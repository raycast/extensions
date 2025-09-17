import { LocalStorage } from "@raycast/api";
import { API_BASE_URL } from "./constants";

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // UNIX timestamp in seconds
  token_type: string;
  expires_in: number;
}

/**
 * Retrieve stored session from LocalStorage
 */
export async function getSession(): Promise<Session | null> {
  const access_token = await LocalStorage.getItem<string>("promptbee_access_token");
  const refresh_token = await LocalStorage.getItem<string>("promptbee_refresh_token");
  const expires_at = await LocalStorage.getItem<string>("promptbee_expires_at");

  if (access_token && refresh_token && expires_at) {
    return {
      access_token,
      refresh_token,
      expires_at: parseInt(expires_at, 10),
      token_type: "bearer",
      expires_in: 3600,
    };
  }
  return null;
}

/**
 * Store session tokens
 */
export async function setSession(session: Session) {
  if (session.access_token) await LocalStorage.setItem("promptbee_access_token", session.access_token);
  if (session.refresh_token) await LocalStorage.setItem("promptbee_refresh_token", session.refresh_token);
  if (session.expires_at) await LocalStorage.setItem("promptbee_expires_at", session.expires_at.toString());
  if (session.token_type) await LocalStorage.setItem("promptbee_token_type", session.token_type);
  if (session.expires_in) await LocalStorage.setItem("promptbee_expires_in", session.expires_in.toString());
}

/**
 * Clear stored session tokens
 */
export async function clearSession() {
  await LocalStorage.removeItem("promptbee_access_token");
  await LocalStorage.removeItem("promptbee_refresh_token");
  await LocalStorage.removeItem("promptbee_expires_at");
  await LocalStorage.removeItem("promptbee_token_type");
  await LocalStorage.removeItem("promptbee_expires_in");
}

/**
 * Decode user info from a JWT access token
 */
export interface UserFromToken {
  id: string | null;
  email: string | null;
}

export function getUserFromToken(token: string): UserFromToken | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    return {
      id: parsed.sub || null,
      email: parsed.email || null,
    };
  } catch (e) {
    console.error("Failed to decode token:", e);
    return null;
  }
}

/**
 * Check if token expired
 */
function isExpired(session: Session) {
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at < now + 60; // refresh 1 min early
}

/**
 * Refresh access token using refresh token
 */
export async function refreshSession(): Promise<Session | null> {
  const session = await getSession();
  if (!session) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (!response.ok) {
      console.error("Failed to refresh session:", await response.text());
      await clearSession();
      return null;
    }

    interface RefreshResponse {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }

    const data = (await response.json()) as RefreshResponse;
    const newSession: Session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? session.refresh_token, // fallback if backend doesn't rotate
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      token_type: "bearer",
      expires_in: data.expires_in,
    };

    await setSession(newSession);
    return newSession;
  } catch (e) {
    console.error("Error refreshing session:", e);
    await clearSession();
    return null;
  }
}

/**
 * Get a valid access token (refreshing if needed)
 */
export async function getValidAccessToken(): Promise<string | null> {
  let session = await getSession();
  if (!session) return null;

  if (isExpired(session)) {
    session = await refreshSession();
  }

  return session?.access_token ?? null;
}
