/**
 * PIN Protection state management for Raycast Extension
 * Handles PIN verification, session management, and protected note access
 */

import { LocalStorage } from "@raycast/api";
import { getAuthenticatedClient, getCurrentUserId } from "./supabase";
import {
  verifyPinHash,
  decryptSnippets,
  EncryptedContent,
  DecryptedSnippetData,
} from "./crypto";

// Storage keys
const PIN_SESSION_KEY = "promptnote_pin_session";
const PIN_SESSION_EXPIRY_KEY = "promptnote_pin_session_expiry";

// Session duration: 15 minutes
const SESSION_DURATION_MS = 15 * 60 * 1000;

/**
 * User PIN settings from database
 */
export interface UserPinSettings {
  user_id: string;
  pin_hash: string;
  pin_salt: string;
  pin_hint: string | null;
}

/**
 * PIN session state
 */
export interface PinSession {
  isUnlocked: boolean;
  expiresAt: number;
  pin?: string; // Stored temporarily for decryption during session
}

/**
 * Get user's PIN settings from database
 */
export async function getUserPinSettings(): Promise<UserPinSettings | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const supabase = await getAuthenticatedClient();
    const { data, error } = await supabase
      .from("user_pin_settings")
      .select("user_id, pin_hash, pin_salt, pin_hint")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found - user hasn't set up PIN
        return null;
      }
      console.error("Failed to get PIN settings:", error.message);
      return null;
    }

    return data as UserPinSettings;
  } catch (error) {
    console.error("Error fetching PIN settings:", error);
    return null;
  }
}

/**
 * Check if user has PIN protection enabled
 */
export async function hasPinSetup(): Promise<boolean> {
  const settings = await getUserPinSettings();
  return settings !== null;
}

/**
 * Get current PIN session from local storage
 */
async function getPinSession(): Promise<PinSession | null> {
  try {
    const sessionData = await LocalStorage.getItem<string>(PIN_SESSION_KEY);
    const expiryData = await LocalStorage.getItem<string>(
      PIN_SESSION_EXPIRY_KEY,
    );

    if (!sessionData || !expiryData) return null;

    const expiresAt = parseInt(expiryData, 10);
    if (Date.now() > expiresAt) {
      // Session expired
      await clearPinSession();
      return null;
    }

    return {
      isUnlocked: true,
      expiresAt,
      pin: sessionData,
    };
  } catch {
    return null;
  }
}

/**
 * Store PIN session
 */
async function storePinSession(pin: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await LocalStorage.setItem(PIN_SESSION_KEY, pin);
  await LocalStorage.setItem(PIN_SESSION_EXPIRY_KEY, expiresAt.toString());
}

/**
 * Clear PIN session (lock)
 */
export async function clearPinSession(): Promise<void> {
  await LocalStorage.removeItem(PIN_SESSION_KEY);
  await LocalStorage.removeItem(PIN_SESSION_EXPIRY_KEY);
}

/**
 * Check if PIN session is active (unlocked)
 */
export async function isPinUnlocked(): Promise<boolean> {
  const session = await getPinSession();
  return session !== null && session.isUnlocked;
}

/**
 * Verify PIN and create session if valid
 * @param pin - PIN to verify
 * @returns true if PIN is valid, false otherwise
 */
export async function verifyAndUnlock(
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getUserPinSettings();

    if (!settings) {
      return { success: false, error: "PIN protection is not set up" };
    }

    const isValid = verifyPinHash(pin, settings.pin_hash, settings.pin_salt);

    if (!isValid) {
      return { success: false, error: "Incorrect PIN" };
    }

    // Store session
    await storePinSession(pin);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify PIN",
    };
  }
}

/**
 * Lock all protected notes (clear session)
 */
export async function lockNotes(): Promise<void> {
  await clearPinSession();
}

/**
 * Get the current PIN from session (for decryption)
 * Returns null if not unlocked
 */
export async function getSessionPin(): Promise<string | null> {
  const session = await getPinSession();
  return session?.pin || null;
}

/**
 * Get PIN hint for the current user
 */
export async function getPinHint(): Promise<string | null> {
  const settings = await getUserPinSettings();
  return settings?.pin_hint || null;
}

/**
 * Decrypt protected note content
 * @param encryptedContent - Encrypted content from note
 * @returns Decrypted snippets or null if not unlocked/failed
 */
export async function decryptProtectedContent(
  encryptedContent: EncryptedContent,
): Promise<DecryptedSnippetData[] | null> {
  try {
    const pin = await getSessionPin();
    if (!pin) {
      return null; // Not unlocked
    }

    const settings = await getUserPinSettings();
    if (!settings) {
      return null;
    }

    const decrypted = decryptSnippets(encryptedContent, pin, settings.pin_salt);
    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt content:", error);
    return null;
  }
}

/**
 * Get remaining session time in minutes
 */
export async function getSessionTimeRemaining(): Promise<number | null> {
  const session = await getPinSession();
  if (!session) return null;

  const remaining = session.expiresAt - Date.now();
  if (remaining <= 0) return 0;

  return Math.ceil(remaining / 60000); // Convert to minutes
}

/**
 * Extend session (refresh expiry)
 */
export async function extendSession(): Promise<void> {
  const session = await getPinSession();
  if (session?.pin) {
    await storePinSession(session.pin);
  }
}
