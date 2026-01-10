import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

// Get debug mode from preferences
const preferences = getPreferenceValues<Preferences>();
export const DEBUG = preferences.debugMode;

/**
 * Debug logger - only logs when DEBUG is true
 */
export function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data || "");
  }
}

/**
 * Show a debug toast notification
 */
export async function debugToast(title: string, message?: string) {
  if (DEBUG) {
    await showToast({
      style: Toast.Style.Animated,
      title: `[DEBUG] ${title}`,
      message: message,
    });
  }
}
