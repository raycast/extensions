/**
 * Authentication for Cleyo Raycast extension
 * Uses a link-based flow similar to Telegram integration
 */

import { LocalStorage, open, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiUrl: string;
}

const STORAGE_KEY = "cleyo-auth";

interface StoredAuth {
  accessToken: string;
  userEmail?: string;
  linkedAt: string;
}

/**
 * Get the API base URL from preferences
 */
export function getApiUrl(): string {
  const { apiUrl } = getPreferenceValues<Preferences>();
  return apiUrl || "https://api.cleyo.app";
}

/**
 * Get stored authentication
 */
export async function getStoredAuth(): Promise<StoredAuth | null> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as StoredAuth;
  } catch {
    return null;
  }
}

/**
 * Store authentication
 */
async function storeAuth(auth: StoredAuth): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

/**
 * Clear stored authentication
 */
export async function clearAuth(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

/**
 * Get access token if available (does NOT trigger auth flow)
 */
export async function getAccessToken(): Promise<string | null> {
  const auth = await getStoredAuth();
  return auth?.accessToken || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const auth = await getStoredAuth();
  return auth?.accessToken != null;
}

interface LinkInitResponse {
  token: string;
  link_url: string;
  expires_at: string;
}

interface PollResponse {
  status: "pending" | "completed" | "expired";
  access_token?: string;
  user_email?: string;
}

/**
 * Initialize authentication - returns link info without opening browser
 */
export async function initAuth(): Promise<LinkInitResponse> {
  const apiUrl = getApiUrl();

  const initResponse = await fetch(
    `${apiUrl}/api/v1/integrations/raycast/init`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!initResponse.ok) {
    throw new Error("Failed to initialize authentication");
  }

  return (await initResponse.json()) as LinkInitResponse;
}

/**
 * Open the authentication page in browser
 */
export async function openAuthPage(linkUrl: string): Promise<void> {
  await open(linkUrl);
}

/**
 * Poll for authentication completion
 */
export async function pollForCompletion(token: string): Promise<string> {
  const apiUrl = getApiUrl();
  const maxAttempts = 60; // 5 minutes with 5 second intervals
  const pollInterval = 5000;

  await showToast({
    style: Toast.Style.Animated,
    title: "Waiting for login...",
    message: "Complete login in your browser",
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${apiUrl}/api/v1/integrations/raycast/poll?token=${encodeURIComponent(token)}`,
    );

    if (!response.ok) {
      throw new Error("Failed to check authentication status");
    }

    const data = (await response.json()) as PollResponse;

    if (data.status === "completed" && data.access_token) {
      // Store the authentication
      await storeAuth({
        accessToken: data.access_token,
        userEmail: data.user_email,
        linkedAt: new Date().toISOString(),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: "Cleyo is now connected",
      });

      return data.access_token;
    }

    if (data.status === "expired") {
      throw new Error("Link expired. Please try again.");
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Authentication timed out. Please try again.");
}

/**
 * Disconnect from Cleyo
 */
export async function disconnect(): Promise<void> {
  await clearAuth();
}
