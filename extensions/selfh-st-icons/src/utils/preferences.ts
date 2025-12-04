import { LocalStorage, KeyModifier, KeyEquivalent } from "@raycast/api";

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
 * Structure defining a keyboard shortcut
 */
interface KeyboardShortcut {
  /** The key to press (letter, number, or special key) */
  key: KeyEquivalent;
  /** Modifier keys required (cmd, shift, etc.) */
  modifiers: KeyModifier[];
  /** Human-readable description of the shortcut's action */
  description: string;
}

/**
 * Keyboard shortcuts configuration for the extension
 */
export const KEYBOARD_SHORTCUTS: Record<string, KeyboardShortcut> = {
  /** Copy icon URL to clipboard */
  COPY_URL: {
    key: "c",
    modifiers: ["cmd"],
    description: "Copy URL",
  },
  /** Download icon to local machine */
  DOWNLOAD: {
    key: "d",
    modifiers: ["cmd"],
    description: "Download",
  },
  /** Switch between light and dark variants */
  TOGGLE_VARIANT: {
    key: "v",
    modifiers: ["cmd"],
    description: "Toggle variant (light/dark)",
  },
  /** Switch between PNG, WebP, and SVG formats */
  TOGGLE_FORMAT: {
    key: "f",
    modifiers: ["cmd"],
    description: "Toggle format (PNG/WebP/SVG)",
  },
  /** Force refresh of the icon index */
  REFRESH_INDEX: {
    key: "r",
    modifiers: ["cmd"],
    description: "Refresh icon index",
  },
  /** Toggle visibility of category filters */
  TOGGLE_CATEGORIES: {
    key: "t",
    modifiers: ["cmd"],
    description: "Toggle categories visibility",
  },
};
