import { LocalStorage, Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { App, AppSetting, UsageHistoryItem } from "../types";

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
  USERNAME_HISTORY: "usernameHistory",
  USAGE_HISTORY: "usageHistory",
  APP_SETTINGS: "appSettings",
  CUSTOM_APPS: "customApps",
} as const;

export const defaultApps: App[] = [
  {
    name: "Bluesky",
    value: "bluesky",
    urlTemplate: "https://bsky.app/profile/{profile}",
  },
  {
    name: "Raycast",
    value: "raycast",
    urlTemplate: "https://www.raycast.com/{profile}",
  },
  {
    name: "Threads",
    value: "threads",
    urlTemplate: "https://www.threads.net/@{profile}",
  },
  {
    name: "X",
    value: "x",
    urlTemplate: "https://x.com/{profile}",
  },
  {
    name: "GitHub",
    value: "github",
    urlTemplate: "https://github.com/{profile}",
  },
  {
    name: "Facebook",
    value: "facebook",
    urlTemplate: "https://www.facebook.com/{profile}",
  },
  {
    name: "Reddit",
    value: "reddit",
    urlTemplate: "https://www.reddit.com/user/{profile}",
  },
  {
    name: "YouTube",
    value: "youtube",
    urlTemplate: "https://www.youtube.com/user/{profile}",
  },
  {
    name: "Instagram",
    value: "instagram",
    urlTemplate: "https://www.instagram.com/{profile}",
  },
  {
    name: "LinkedIn",
    value: "linkedin",
    urlTemplate: "https://www.linkedin.com/in/{profile}",
  },
  {
    name: "TikTok",
    value: "tiktok",
    urlTemplate: "https://www.tiktok.com/@{profile}",
  },
];

export async function getAllApps(): Promise<App[]> {
  const customApps = await getCustomApps();
  const appSettings = await getAppSettings();

  // Create a map for quick lookup of app settings
  const settingsMap = new Map<string, AppSetting>();
  appSettings.forEach((setting) => {
    settingsMap.set(setting.value, setting);
  });

  // Filter sites based on enabled flag (default to enabled when no settings entry)
  const allApps = [...defaultApps, ...customApps];
  return allApps.filter((app) => {
    const setting = settingsMap.get(app.value);
    return setting ? setting.enabled : true; // Default to enabled when no settings entry
  });
}

// Get custom apps
export async function getCustomApps(): Promise<App[]> {
  const customAppsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.CUSTOM_APPS);
  return customAppsJson ? JSON.parse(customAppsJson) : [];
}

// Username History functions (legacy - kept for backwards compatibility)
export async function getUsernameHistory(): Promise<string[]> {
  const historyJson = await LocalStorage.getItem<string>(STORAGE_KEYS.USERNAME_HISTORY);
  return historyJson ? JSON.parse(historyJson) : [];
}

export async function addToUsernameHistory(username: string): Promise<void> {
  const history = await getUsernameHistory();

  // Remove if already exists to avoid duplicates
  const filtered = history.filter((u) => u !== username);

  // Add to beginning of array
  const updated = [username, ...filtered].slice(0, 20); // Keep max 20 items

  await LocalStorage.setItem(STORAGE_KEYS.USERNAME_HISTORY, JSON.stringify(updated));
}

// Usage History functions (tracks username + app combinations)
export async function getUsageHistory(): Promise<UsageHistoryItem[]> {
  const historyJson = await LocalStorage.getItem<string>(STORAGE_KEYS.USAGE_HISTORY);
  return historyJson ? JSON.parse(historyJson) : [];
}

export async function addToUsageHistory(username: string, app: string, appName: string): Promise<void> {
  const history = await getUsageHistory();

  // Remove if already exists to avoid duplicates
  const filtered = history.filter((item) => !(item.username === username && item.app === app));

  // Add new entry to beginning of array
  const newItem: UsageHistoryItem = {
    username,
    app,
    appName,
    timestamp: Date.now(),
  };
  const updated = [newItem, ...filtered].slice(0, 20); // Keep max 20 items

  await LocalStorage.setItem(STORAGE_KEYS.USAGE_HISTORY, JSON.stringify(updated));
}

export async function removeUsageHistoryItem(username: string, app: string): Promise<void> {
  const history = await getUsageHistory();

  // Filter out the matching record
  const filtered = history.filter((item) => !(item.username === username && item.app === app));

  // Write back the updated list
  await LocalStorage.setItem(STORAGE_KEYS.USAGE_HISTORY, JSON.stringify(filtered));
}

// App Settings functions
export async function getAppSettings(): Promise<AppSetting[]> {
  const settingsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.APP_SETTINGS);
  return settingsJson ? JSON.parse(settingsJson) : [];
}

export async function updateAppSettings(settings: AppSetting[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
}

// Custom Apps functions
export async function addCustomApp(app: App): Promise<void> {
  const customApps = await getCustomApps();
  const updated = [...customApps, app];
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updated));
}

export async function removeCustomApp(value: string): Promise<void> {
  const customApps = await getCustomApps();
  const updated = customApps.filter((p) => p.value !== value);
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updated));
}
