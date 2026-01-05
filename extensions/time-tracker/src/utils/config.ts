import path from "path";
import os from "os";
import { existsSync, readdirSync } from "fs";
import { getPreferenceValues } from "@raycast/api";

/**
 * Centralized configuration for Time Tracker extension
 */

// Raycast preferences interface
interface Preferences {
  dataPath?: string;
  dateFormat?: string;
  defaultColor?: string;
}

// Data folder and file names
export const DATA_FOLDER = "TimeTrack";
export const DATA_FILE = "data.json";

// Default project colors
export const DEFAULT_PROJECT_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#3B82F6", // Blue (default)
  "#8B5CF6", // Purple
  "#EC4899", // Pink
] as const;

export const DEFAULT_COLOR = "#3B82F6"; // Blue

// Supported duration formats (for documentation)
export const DURATION_FORMATS = {
  decimal: "2.5 (decimal hours)",
  hoursMinutes: "2h30 (hours and minutes)",
  colon: "2:30 (clock format)",
  minutes: "30m (minutes only)",
  hours: "2h (hours only)",
} as const;

/**
 * Automatically finds the best storage path
 * Tries to detect common cloud storage locations
 */
export function getDefaultStoragePath(): string {
  const homeDir = os.homedir();

  // Try to detect cloud storage paths in order of preference
  const cloudPaths = [
    // Google Drive (macOS 12+ CloudStorage)
    () => {
      const cloudStoragePath = path.join(homeDir, "Library", "CloudStorage");
      if (existsSync(cloudStoragePath)) {
        try {
          const entries = readdirSync(cloudStoragePath);
          const googleDriveFolder = entries.find((entry) =>
            entry.startsWith("GoogleDrive-"),
          );
          if (googleDriveFolder) {
            return path.join(cloudStoragePath, googleDriveFolder, "My Drive");
          }
        } catch {
          // Continue
        }
      }
      return null;
    },
    // Legacy Google Drive paths
    () => {
      const legacyPaths = [
        path.join(homeDir, "Google Drive", "My Drive"),
        path.join(homeDir, "Google Drive"),
        path.join(homeDir, "GoogleDrive"),
      ];
      for (const legacyPath of legacyPaths) {
        if (existsSync(legacyPath)) {
          return legacyPath;
        }
      }
      return null;
    },
    // Dropbox
    () => {
      const dropboxPath = path.join(homeDir, "Dropbox");
      return existsSync(dropboxPath) ? dropboxPath : null;
    },
    // iCloud Drive
    () => {
      const icloudPath = path.join(
        homeDir,
        "Library",
        "Mobile Documents",
        "com~apple~CloudDocs",
      );
      return existsSync(icloudPath) ? icloudPath : null;
    },
  ];

  // Try each cloud path
  for (const getPath of cloudPaths) {
    const cloudPath = getPath();
    if (cloudPath) {
      return cloudPath;
    }
  }

  // Default: Use ~/Documents if no cloud storage detected
  return path.join(homeDir, "Documents");
}

/**
 * Returns the complete data file path
 */
export function getDataFilePath(): string {
  const storagePath = getDefaultStoragePath();
  return path.join(storagePath, DATA_FOLDER, DATA_FILE);
}

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  // Maximum number of entries displayed by default
  maxEntriesPerPage: 50,

  // Date display format
  dateFormat: "MMM dd, yyyy",

  // Short date format
  dateFormatShort: "MMM dd",

  // Week start day (1 = Monday, 0 = Sunday)
  weekStartsOn: 1,

  // Toast duration (ms)
  toastDuration: 2000,
} as const;

/**
 * Get preferences from Raycast
 */
function getPreferences(): Preferences {
  try {
    return getPreferenceValues<Preferences>();
  } catch {
    return {};
  }
}

/**
 * Get custom data path from environment variable
 * Useful for tests or custom configurations
 */
export function getCustomDataPath(): string | undefined {
  return process.env.TIMETRACK_DATA_PATH;
}

/**
 * Returns the final data path considering all overrides
 * Priority: Raycast preference > Environment variable > Auto-detected path
 */
export function getFinalDataPath(): string {
  const preferences = getPreferences();

  // 1. Check Raycast preference
  if (preferences.dataPath?.trim()) {
    return preferences.dataPath.trim().replace(/^~/, os.homedir());
  }

  // 2. Check environment variable
  const envPath = getCustomDataPath();
  if (envPath) {
    return envPath;
  }

  // 3. Use auto-detected path
  return getDataFilePath();
}

/**
 * Get the default color for new projects from preferences
 */
export function getDefaultProjectColor(): string {
  const preferences = getPreferences();
  return preferences.defaultColor || DEFAULT_COLOR;
}

/**
 * Get the date format from preferences
 */
export function getDateFormat(): string {
  const preferences = getPreferences();
  return preferences.dateFormat || UI_CONFIG.dateFormat;
}
