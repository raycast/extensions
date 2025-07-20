import { LocalStorage } from "@raycast/api";

// Storage keys
const STORAGE_KEYS = {
  USERNAME_HISTORY: "username_history",
  PLATFORM_SETTINGS: "platform_settings",
  CUSTOM_PLATFORMS: "custom_platforms",
} as const;

// Default values
const DEFAULT_USERNAME_HISTORY: string[] = [];
const DEFAULT_PLATFORM_SETTINGS: Record<string, boolean> = {};
const DEFAULT_CUSTOM_PLATFORMS: CustomPlatform[] = [];

// Types
export interface CustomPlatform {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

// Username History Functions
export async function getUsernameHistory(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.USERNAME_HISTORY);
    if (!stored) return DEFAULT_USERNAME_HISTORY;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error getting username history:", error);
    return DEFAULT_USERNAME_HISTORY;
  }
}

export async function addUsername(username: string): Promise<void> {
  try {
    const history = await getUsernameHistory();

    // Remove if already exists to avoid duplicates
    const filtered = history.filter((u) => u !== username);

    // Add to beginning of array
    const updated = [username, ...filtered];

    // Keep only last 20 usernames
    const trimmed = updated.slice(0, 20);

    await LocalStorage.setItem(STORAGE_KEYS.USERNAME_HISTORY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Error adding username:", error);
  }
}

// Platform Settings Functions
export async function getPlatformSettings(): Promise<Record<string, boolean>> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PLATFORM_SETTINGS);
    if (!stored) return DEFAULT_PLATFORM_SETTINGS;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error getting platform settings:", error);
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

export async function setPlatformEnabled(platformId: string, enabled: boolean): Promise<void> {
  try {
    const settings = await getPlatformSettings();
    settings[platformId] = enabled;
    await LocalStorage.setItem(STORAGE_KEYS.PLATFORM_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Error setting platform enabled:", error);
  }
}

// Custom Platforms Functions
export async function getCustomPlatforms(): Promise<CustomPlatform[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.CUSTOM_PLATFORMS);
    if (!stored) return DEFAULT_CUSTOM_PLATFORMS;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error getting custom platforms:", error);
    return DEFAULT_CUSTOM_PLATFORMS;
  }
}

export async function addCustomPlatform(platform: Omit<CustomPlatform, "id">): Promise<string> {
  try {
    const platforms = await getCustomPlatforms();
    const id = generateId();
    const newPlatform: CustomPlatform = {
      id,
      ...platform,
    };

    platforms.push(newPlatform);
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(platforms));
    return id;
  } catch (error) {
    console.error("Error adding custom platform:", error);
    throw error;
  }
}

export async function updateCustomPlatform(id: string, updates: Partial<Omit<CustomPlatform, "id">>): Promise<void> {
  try {
    const platforms = await getCustomPlatforms();
    const index = platforms.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Custom platform with id "${id}" not found`);
    }

    platforms[index] = { ...platforms[index], ...updates };
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(platforms));
  } catch (error) {
    console.error("Error updating custom platform:", error);
    throw error;
  }
}

export async function removeCustomPlatform(id: string): Promise<void> {
  try {
    const platforms = await getCustomPlatforms();
    const filtered = platforms.filter((p) => p.id !== id);
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing custom platform:", error);
    throw error;
  }
}

// Helper function to generate unique IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
