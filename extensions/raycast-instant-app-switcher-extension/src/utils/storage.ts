import { LocalStorage } from "@raycast/api";
import { HOTKEY_STORAGE_KEY, RECENT_APPS_STORAGE_KEY, MAX_RECENT_APPS } from "../types";

/**
 * Load hotkey assignments from LocalStorage
 */
export async function loadHotkeyAssignments(): Promise<Map<string, string>> {
  try {
    const stored = await LocalStorage.getItem<string>(HOTKEY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error("Error loading hotkey assignments:", error);
  }
  return new Map();
}

/**
 * Save hotkey assignments to LocalStorage
 */
export async function saveHotkeyAssignments(assignments: Map<string, string>): Promise<void> {
  try {
    const obj = Object.fromEntries(assignments);
    await LocalStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error("Error saving hotkey assignments:", error);
    throw error;
  }
}

/**
 * Load recent apps from LocalStorage
 */
export async function loadRecentApps(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_APPS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading recent apps:", error);
  }
  return [];
}

/**
 * Save recent apps to LocalStorage
 */
export async function saveRecentApps(recentApps: string[]): Promise<void> {
  try {
    await LocalStorage.setItem(RECENT_APPS_STORAGE_KEY, JSON.stringify(recentApps));
  } catch (error) {
    console.error("Error saving recent apps:", error);
  }
}

/**
 * Add app to recent list (moves to front, removes duplicates, trims to max)
 */
export async function addToRecentApps(appName: string, currentRecent: string[]): Promise<string[]> {
  // Remove app if it already exists
  const filtered = currentRecent.filter((name) => name !== appName);
  // Add to front
  const newRecent = [appName, ...filtered];
  // Keep only last MAX_RECENT_APPS
  const trimmed = newRecent.slice(0, MAX_RECENT_APPS);
  // Save to storage
  await saveRecentApps(trimmed);
  return trimmed;
}
