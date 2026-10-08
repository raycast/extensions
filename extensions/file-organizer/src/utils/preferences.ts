import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import path from "path";

interface Preferences {
  scanDirectories: string[];
  scanDepth: number;
  excludeDirectories: string[];
}

interface RaycastPreferences {
  scanDirectories: string;
  scanDepth: string;
  excludeDirectories: string;
}

// Convert comma-separated string to array and resolve home paths
function parseDirectoriesPreference(dirString: string): string[] {
  return dirString
    .split(",")
    .map((dir) => dir.trim())
    .filter(Boolean)
    .map(resolveHomePath);
}

export function getPreferences(): Preferences {
  try {
    // Get preferences from Raycast
    const raycastPrefs = getPreferenceValues<RaycastPreferences>();

    const parsed = parseInt(raycastPrefs.scanDepth, 10);
    // Parse directory strings into arrays
    const preferences: Preferences = {
      scanDirectories: parseDirectoriesPreference(raycastPrefs.scanDirectories),
      scanDepth: isNaN(parsed) || parsed < 0 ? 10 : parsed,
      excludeDirectories: parseDirectoriesPreference(raycastPrefs.excludeDirectories),
    };
    console.log("preferences", preferences);

    return preferences;
  } catch (error) {
    console.error("Error loading preferences:", error);
    // Fallback to default preferences if there's an error
    return {
      scanDirectories: [
        resolveHomePath("~/Documents"),
        resolveHomePath("~/Desktop"),
        resolveHomePath("~/Downloads"),
        resolveHomePath("~/Pictures"),
        resolveHomePath("~/Movies"),
        resolveHomePath("~/Music"),
      ],
      scanDepth: 10,
      excludeDirectories: [
        resolveHomePath("~/Library"),
        "node_modules",
        ".git",
        resolveHomePath("~/Applications"),
        resolveHomePath("~/.npm"),
        resolveHomePath("~/.vscode"),
        ".next", // Next.js build output
        "dist", // Common build output directory
        "build", // Common build output directory
        ".cache", // Various build/cache directories
        ".DS_Store", // macOS system files
        "__pycache__", // Python cache
        "target", // Rust/Maven build directory
        "vendor", // Dependencies in many languages
        "coverage", // Test coverage reports
        "tmp", // Temporary files
        ".tmp", // Another common temp directory
        ".sass-cache", // SASS compilation cache
      ],
    };
  }
}

export function resolveHomePath(dirPath: string): string {
  if (dirPath.startsWith("~")) {
    return path.join(homedir(), dirPath.slice(1));
  }
  return dirPath;
}
