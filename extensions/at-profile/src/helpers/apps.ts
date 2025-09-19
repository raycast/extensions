import { LocalStorage, Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { App, AppSetting, UsageHistoryItem } from "../types";
import { defaultApps } from "../utils/default-apps";

/**
 * Get the base domain URL for favicon fetching from a URL template
 */
function getBaseUrlFromTemplate(urlTemplate: string): string {
  try {
    // Replace {profile} with a dummy value to create a valid URL
    const testUrl = urlTemplate.replace(/{profile}/g, "test");
    const url = new URL(testUrl);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    // Fallback for malformed URLs
    return "https://example.com";
  }
}

/**
 * Get favicon for an app using Raycast's getFavicon utility
 */
export function getAppFavicon(app: App) {
  const baseUrl = getBaseUrlFromTemplate(app.urlTemplate);
  return getFavicon(baseUrl, { fallback: Icon.Globe });
}

// LocalStorage Schema Keys
export const STORAGE_KEYS = {
  USAGE_HISTORY: "usageHistory",
  APP_SETTINGS: "appSettings",
  CUSTOM_APPS: "customApps",
} as const;

/**
 * Get all apps including custom apps, filtered by visibility settings
 * @returns Promise<App[]> Array of visible apps
 */
export async function getAllApps(): Promise<App[]> {
  const customApps = await getCustomApps();
  const appSettings = await getAppSettings();

  // Create a map for quick lookup of app settings
  const settingsMap = new Map<string, AppSetting>();
  appSettings.forEach((setting) => {
    settingsMap.set(setting.value, setting);
  });

  // Filter apps based on visible flag (default to visible when no settings entry)
  const allApps = [...defaultApps, ...customApps];
  return allApps.filter((app) => {
    const setting = settingsMap.get(app.value);
    return setting ? setting.visible : true; // Default to visible when no settings entry
  });
}

/**
 * Get all apps without filtering by enabled status
 * Used for Quick Open where we want to bypass manage apps settings
 */
export async function getAllAppsUnfiltered(): Promise<App[]> {
  const customApps = await getCustomApps();
  return [...defaultApps, ...customApps];
}

/**
 * Get custom apps from local storage
 * @returns Promise<App[]> Array of custom apps
 */
export async function getCustomApps(): Promise<App[]> {
  const customAppsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.CUSTOM_APPS);
  return customAppsJson ? JSON.parse(customAppsJson) : [];
}

/**
 * Get usage history from local storage (tracks profile + app combinations)
 * @returns Promise<UsageHistoryItem[]> Array of usage history items
 */
export async function getUsageHistory(): Promise<UsageHistoryItem[]> {
  const historyJson = await LocalStorage.getItem<string>(STORAGE_KEYS.USAGE_HISTORY);
  return historyJson ? JSON.parse(historyJson) : [];
}

/**
 * Add a profile + app combination to usage history
 * @param profile - Profile name
 * @param app - App value/identifier
 * @param appName - Human-readable app name
 */
export async function addToUsageHistory(profile: string, app: string, appName: string): Promise<void> {
  const history = await getUsageHistory();

  // Remove if already exists to avoid duplicates
  const filtered = history.filter((item) => !(item.profile === profile && item.app === app));

  // Add new entry to beginning of array
  const newItem: UsageHistoryItem = {
    profile,
    app,
    appName,
    timestamp: Date.now(),
  };
  const updated = [newItem, ...filtered].slice(0, 20); // Keep max 20 items

  await LocalStorage.setItem(STORAGE_KEYS.USAGE_HISTORY, JSON.stringify(updated));
}

/**
 * Remove a specific profile + app combination from usage history
 * @param profile - Profile name to remove
 * @param app - App value/identifier to remove
 */
export async function removeUsageHistoryItem(profile: string, app: string): Promise<void> {
  const history = await getUsageHistory();

  // Filter out the matching record
  const filtered = history.filter((item) => !(item.profile === profile && item.app === app));

  // Write back the updated list
  await LocalStorage.setItem(STORAGE_KEYS.USAGE_HISTORY, JSON.stringify(filtered));
}

/**
 * Update a profile name in usage history while preserving the app association
 * @param oldProfile - Current profile name
 * @param oldApp - App value/identifier
 * @param newProfile - New profile name
 */
export async function updateUsageHistoryItem(oldProfile: string, oldApp: string, newProfile: string): Promise<void> {
  const history = await getUsageHistory();

  // Find and update the matching record
  const updated = history.map((item) => {
    if (item.profile === oldProfile && item.app === oldApp) {
      return { ...item, profile: newProfile, timestamp: Date.now() };
    }
    return item;
  });

  // Write back the updated list
  await LocalStorage.setItem(STORAGE_KEYS.USAGE_HISTORY, JSON.stringify(updated));
}

/**
 * Get app settings from local storage
 * @returns Promise<AppSetting[]> Array of app visibility settings
 */
export async function getAppSettings(): Promise<AppSetting[]> {
  const settingsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.APP_SETTINGS);
  return settingsJson ? JSON.parse(settingsJson) : [];
}

/**
 * Update app settings in local storage
 * @param settings - Array of app settings to save
 */
export async function updateAppSettings(settings: AppSetting[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
}

/**
 * Add a new custom app to local storage
 * @param app - Custom app to add
 */
export async function addCustomApp(app: App): Promise<void> {
  const customApps = await getCustomApps();
  const updated = [...customApps, app];
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updated));
}

/**
 * Remove a custom app from local storage
 * @param value - App value/identifier to remove
 */
export async function removeCustomApp(value: string): Promise<void> {
  const customApps = await getCustomApps();
  const updated = customApps.filter((p) => p.value !== value);
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updated));
}
