import { LocalStorage, Keyboard } from "@raycast/api";

/**
 * User preferences for the Selfh.st Icons extension
 */
export interface Preferences {
  /** Theme preference: system, light, or dark */
  theme: "system" | "light" | "dark";
  /** Default format for icon downloads */
  defaultFormat: "png" | "webp" | "svg";
  /** Directory path for downloaded icons */
  downloadLocation: string;
  /** Icon index refresh interval in hours */
  refreshInterval: number;
}

/** Key for storing preferences in LocalStorage */
const PREFERENCES_KEY = "preferences";

/**
 * Default preferences used for new installations
 * or when stored preferences are invalid
 */
const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  defaultFormat: "png",
  downloadLocation: "~/Downloads",
  refreshInterval: 24,
};

/**
 * Retrieves user preferences, falling back to defaults if not set or invalid
 * @returns Promise resolving to current preferences
 */
export async function getPreferences(): Promise<Preferences> {
  const storedPrefs = await LocalStorage.getItem<string>(PREFERENCES_KEY);
  if (!storedPrefs) {
    return DEFAULT_PREFERENCES;
  }
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Updates user preferences
 * @param prefs - Partial preferences object with values to update
 */
export async function setPreferences(
  prefs: Partial<Preferences>,
): Promise<void> {
  const currentPrefs = await getPreferences();
  const newPrefs = { ...currentPrefs, ...prefs };
  await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
}

/**
 * Keyboard shortcuts configuration for the extension
 */
export const KEYBOARD_SHORTCUTS: Record<string, Keyboard.Shortcut> = {
  /** Copy icon URL to clipboard */
  COPY_URL: {
    macOS: { modifiers: ["cmd"], key: "c" },
    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
  },
  /** Download icon to local machine */
  DOWNLOAD: {
    macOS: { modifiers: ["cmd"], key: "d" },
    Windows: { modifiers: ["ctrl"], key: "d" },
  },
  /** Switch between light and dark variants */
  TOGGLE_VARIANT: {
    macOS: { modifiers: ["cmd"], key: "v" },
    Windows: { modifiers: ["ctrl"], key: "v" },
  },
  /** Switch between PNG, WebP, and SVG formats */
  TOGGLE_FORMAT: {
    macOS: { modifiers: ["cmd"], key: "f" },
    Windows: { modifiers: ["ctrl"], key: "f" },
  },
  /** Force refresh of the icon index */
  REFRESH_INDEX: {
    macOS: { modifiers: ["cmd"], key: "r" },
    Windows: { modifiers: ["ctrl"], key: "r" },
  },
  /** Toggle visibility of category filters */
  TOGGLE_CATEGORIES: {
    macOS: { modifiers: ["cmd"], key: "t" },
    Windows: { modifiers: ["ctrl"], key: "t" },
  },
};
