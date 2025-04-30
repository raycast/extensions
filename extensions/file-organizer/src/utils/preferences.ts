import { LocalStorage } from "@raycast/api";
import { homedir } from "os";
import path from "path";

interface Preferences {
  scanDirectories: string[];
  scanDepth: number;
  excludeDirectories: string[];
}

const DEFAULT_PREFERENCES: Preferences = {
  scanDirectories: ["~/Documents", "~/Desktop", "~/Downloads", "~/Pictures", "~/Movies", "~/Music"],
  scanDepth: 10,
  excludeDirectories: ["~/Library", "~/node_modules", "~/.git", "~/Applications", "~/.npm", "~/.vscode"],
};

const PREF_KEY = "file-organizer-preferences";

export async function getPreferences(): Promise<Preferences> {
  try {
    const storedPrefs = await LocalStorage.getItem<string>(PREF_KEY);

    if (storedPrefs) {
      const parsed = JSON.parse(storedPrefs) as Partial<Preferences>;
      // Ensure all fields exist with defaults as fallback
      return {
        scanDirectories: parsed.scanDirectories || DEFAULT_PREFERENCES.scanDirectories,
        scanDepth: parsed.scanDepth || DEFAULT_PREFERENCES.scanDepth,
        excludeDirectories: parsed.excludeDirectories || DEFAULT_PREFERENCES.excludeDirectories,
      };
    }

    // If no preferences found, store defaults and return them
    await savePreferences(DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error("Error loading preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  await LocalStorage.setItem(PREF_KEY, JSON.stringify(preferences));
}

export function resolveHomePath(dirPath: string): string {
  if (dirPath.startsWith("~")) {
    return path.join(homedir(), dirPath.slice(1));
  }
  return dirPath;
}
