import { LocalStorage } from "@raycast/api";
import { validateSessionKey } from "../services/auth";

const STORAGE_KEYS = {
  SESSION_KEY: "lastfm_session_key",
} as const;

/**
 * Store the Last.fm session key
 */
export async function storeSessionKey(sessionKey: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.SESSION_KEY, sessionKey);
}

/**
 * Get the stored Last.fm session key
 * @returns The session key if it exists, null otherwise
 */
export async function getSessionKey(): Promise<string | null> {
  const key = await LocalStorage.getItem(STORAGE_KEYS.SESSION_KEY);
  return typeof key === "string" ? key : null;
}

/**
 * Check if we have a stored session key
 */
export async function hasSessionKey(): Promise<boolean> {
  const key = await getSessionKey();
  return key !== null;
}

/**
 * Remove the stored session key
 */
export async function removeSessionKey(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.SESSION_KEY);
}

/**
 * Validate the stored session key
 * @returns true if the key exists and is valid, false otherwise
 */
export async function validateStoredSessionKey(): Promise<boolean> {
  const key = await getSessionKey();
  if (!key) return false;

  return validateSessionKey(key);
}
