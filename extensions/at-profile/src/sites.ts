import { LocalStorage } from "@raycast/api";

export interface Site {
  name: string;
  value: string;
  urlTemplate: string;
}

// LocalStorage Schema Types
export interface PlatformSetting {
  value: string;
  enabled: boolean;
}

// LocalStorage Schema Keys
export const STORAGE_KEYS = {
  USERNAME_HISTORY: "usernameHistory",
  PLATFORM_SETTINGS: "platformSettings",
  CUSTOM_PLATFORMS: "customPlatforms",
} as const;

// Legacy key for migration
const LEGACY_CUSTOM_SITES_KEY = "customSites";

export const defaultSites: Site[] = [
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

export async function getAllSites(): Promise<Site[]> {
  const customPlatforms = await getCustomPlatforms();
  const platformSettings = await getPlatformSettings();

  // Create a map for quick lookup of platform settings
  const settingsMap = new Map<string, PlatformSetting>();
  platformSettings.forEach((setting) => {
    settingsMap.set(setting.value, setting);
  });

  // Filter sites based on enabled flag (default to enabled when no settings entry)
  const allSites = [...defaultSites, ...customPlatforms];
  return allSites.filter((site) => {
    const setting = settingsMap.get(site.value);
    return setting ? setting.enabled : true; // Default to enabled when no settings entry
  });
}

// Get custom platforms with v1→v2 migration
export async function getCustomPlatforms(): Promise<Site[]> {
  // Check new key first
  let customPlatformsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.CUSTOM_PLATFORMS);

  // If not found, try legacy key and migrate
  if (!customPlatformsJson) {
    const legacyCustomSitesJson = await LocalStorage.getItem<string>(LEGACY_CUSTOM_SITES_KEY);
    if (legacyCustomSitesJson) {
      // Migrate from v1 to v2
      await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, legacyCustomSitesJson);
      await LocalStorage.removeItem(LEGACY_CUSTOM_SITES_KEY);
      customPlatformsJson = legacyCustomSitesJson;
    }
  }

  return customPlatformsJson ? JSON.parse(customPlatformsJson) : [];
}

// Username History functions
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

// Platform Settings functions
export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  const settingsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.PLATFORM_SETTINGS);
  return settingsJson ? JSON.parse(settingsJson) : [];
}

export async function updatePlatformSettings(settings: PlatformSetting[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.PLATFORM_SETTINGS, JSON.stringify(settings));
}

// Custom Platforms functions
export async function addCustomPlatform(platform: Site): Promise<void> {
  const customPlatforms = await getCustomPlatforms();
  const updated = [...customPlatforms, platform];
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(updated));
}

export async function removeCustomPlatform(value: string): Promise<void> {
  const customPlatforms = await getCustomPlatforms();
  const updated = customPlatforms.filter((p) => p.value !== value);
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(updated));
}
