import { getPreferenceValues, showToast, Toast, openExtensionPreferences, LocalStorage } from "@raycast/api";
import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
} from "psn-api";

interface Preferences {
  npssoToken: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = "psn_auth_tokens";
const EXPIRATION_BUFFER_MS = 60000;

/**
 * Get stored authentication tokens from local storage
 */
export async function getStoredTokens(): Promise<StoredTokens | null> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Store authentication tokens to local storage
 */
export async function storeTokens(tokens: StoredTokens): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Clear stored authentication tokens
 */
export async function clearStoredTokens(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if stored tokens are still valid (not expired)
 */
export function areTokensValid(tokens: StoredTokens | null): boolean {
  if (!tokens) return false;
  return Date.now() < tokens.expiresAt;
}

/**
 * Refresh authentication tokens using refresh token
 */
export async function refreshAuthTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const refreshedAuth = await exchangeRefreshTokenForAuthTokens(refreshToken);

    // Store the new tokens with expiration buffer
    const newTokens: StoredTokens = {
      accessToken: refreshedAuth.accessToken,
      refreshToken: refreshedAuth.refreshToken,
      expiresAt: Date.now() + refreshedAuth.expiresIn * 1000 - EXPIRATION_BUFFER_MS, // 1 minute buffer
    };
    await storeTokens(newTokens);

    return {
      accessToken: refreshedAuth.accessToken,
      refreshToken: refreshedAuth.refreshToken,
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    await clearStoredTokens();
    throw error;
  }
}

/**
 * Get new authentication tokens using NPSSO token
 */
export async function getNewAuthTokens(npssoToken: string): Promise<AuthTokens> {
  try {
    const accessCode = await exchangeNpssoForAccessCode(npssoToken);
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode);

    // Store the new tokens with expiration buffer
    const newTokens: StoredTokens = {
      accessToken: authorization.accessToken,
      refreshToken: authorization.refreshToken,
      expiresAt: Date.now() + authorization.expiresIn * 1000 - 60000, // 1 minute buffer
    };
    await storeTokens(newTokens);

    return {
      accessToken: authorization.accessToken,
      refreshToken: authorization.refreshToken,
    };
  } catch (error) {
    console.error("Authentication failed:", error);
    await clearStoredTokens();
    throw error;
  }
}

/**
 * Show authentication error toast with preference action
 */
export async function showAuthErrorToast(message: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Authentication Failed",
    message: message,
    primaryAction: {
      title: "Open Preferences",
      onAction: () => openExtensionPreferences(),
    },
  });
}

/**
 * Get valid authorization tokens with automatic refresh
 * This is the main function that other commands should use
 */
export async function getValidAuthorization(): Promise<AuthTokens> {
  const preferences = getPreferenceValues<Preferences>();

  // Check if NPSSO token is configured
  if (!preferences.npssoToken) {
    await showToast({
      style: Toast.Style.Failure,
      title: "NPSSO Token Required",
      message: "Please configure your NPSSO token in preferences",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    throw new Error("NPSSO token not configured");
  }

  // Check if we have valid stored tokens
  const storedTokens = await getStoredTokens();
  if (areTokensValid(storedTokens)) {
    return {
      accessToken: storedTokens!.accessToken,
      refreshToken: storedTokens!.refreshToken,
    };
  }

  // Try to refresh tokens if we have a refresh token
  if (storedTokens?.refreshToken) {
    try {
      return await refreshAuthTokens(storedTokens.refreshToken);
    } catch (refreshError) {
      console.error("Token refresh failed, trying to get new tokens:", refreshError);
    }
  }

  // Get new tokens using NPSSO
  try {
    return await getNewAuthTokens(preferences.npssoToken);
  } catch {
    await showAuthErrorToast("Invalid NPSSO token. Please update your token in preferences.");
    throw new Error("Authentication failed");
  }
}
