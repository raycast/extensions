import { LocalStorage } from "@raycast/api";
import { StoredTokens } from "./types";
import { STORAGE_KEYS } from "./constants";

/**
 * Retrieve stored tokens from LocalStorage
 */
export async function getStoredTokens(): Promise<StoredTokens | null> {
  try {
    const accessToken = await LocalStorage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = await LocalStorage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
    const expiresAt = await LocalStorage.getItem<number>(STORAGE_KEYS.EXPIRES_AT);
    const codeVerifier = await LocalStorage.getItem<string>(STORAGE_KEYS.CODE_VERIFIER);

    if (!accessToken || !refreshToken || !expiresAt) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      code_verifier: codeVerifier || undefined,
    };
  } catch (error) {
    console.error("Error retrieving stored tokens:", error);
    return null;
  }
}

/**
 * Save tokens to LocalStorage
 */
export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  createdAt: number,
  codeVerifier?: string,
): Promise<void> {
  try {
    const expiresAt = (createdAt + expiresIn) * 1000; // Convert to milliseconds

    await LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await LocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    await LocalStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt);
    if (codeVerifier) {
      await LocalStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
    }
  } catch (error) {
    console.error("Error saving tokens:", error);
    throw error;
  }
}

/**
 * Clear all stored tokens
 */
export async function clearTokens(): Promise<void> {
  try {
    await LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await LocalStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await LocalStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    await LocalStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  } catch (error) {
    console.error("Error clearing tokens:", error);
    throw error;
  }
}

/**
 * Check if tokens are expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}
