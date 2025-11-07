/**
 * Preferences management for NordPass extension
 * Handles storing and retrieving user preferences like export file path
 */

import { getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { environment } from "@raycast/api";

/**
 * Extension preferences structure
 */
export interface Preferences {
  exportFilePath: string;
}

/**
 * Default export file locations to check
 */
const DEFAULT_EXPORT_PATHS = [
  path.join(process.env.HOME || "", "Downloads", "nordpass-export.csv"),
  path.join(process.env.HOME || "", "Desktop", "nordpass-export.csv"),
  path.join(process.env.HOME || "", "Documents", "nordpass-export.csv"),
];

/**
 * Auto-detect NordPass export files in the .nordpass directory
 * Returns the most recent export file if multiple exist
 */
function findNordPassExportInDirectory(dirPath: string): string | null {
  try {
    if (!fs.existsSync(dirPath)) {
      return null;
    }

    const files = fs.readdirSync(dirPath);
    // Filter for CSV files that look like NordPass exports
    const exportFiles = files
      .filter((file) => file.toLowerCase().endsWith(".csv") && file.toLowerCase().includes("nordpass"))
      .map((file) => ({
        name: file,
        path: path.join(dirPath, file),
        stats: fs.statSync(path.join(dirPath, file)),
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // Most recent first

    return exportFiles.length > 0 ? exportFiles[0].path : null;
  } catch {
    return null;
  }
}

/**
 * Get user preferences, with defaults
 */
export function getPreferences(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  return {
    exportFilePath: prefs.exportFilePath || "",
  };
}

/**
 * Set the export file path preference
 * Note: Preferences are managed through Raycast's UI, not programmatically
 * This function is kept for API compatibility but doesn't actually modify preferences
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setExportFilePath(_filePath: string): Promise<void> {
  // Preferences can only be set through Raycast's preferences UI
  // Users should set the export file path in Raycast Preferences → Extensions → NordPass
  console.log("Note: Export file path should be set in Raycast Preferences UI");
}

/**
 * Expand tilde in file path
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return filePath.replace("~", process.env.HOME || "");
  }
  return filePath;
}

/**
 * Get the export file path, auto-detecting if not set
 */
export function getExportFilePath(): string | null {
  const prefs = getPreferences();

  // If user has set a preference, use it (expand tilde if present)
  if (prefs.exportFilePath) {
    const expandedPath = expandTilde(prefs.exportFilePath);
    if (fs.existsSync(expandedPath)) {
      return expandedPath;
    }
  }

  // Otherwise, try to auto-detect from common locations
  for (const defaultPath of DEFAULT_EXPORT_PATHS) {
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }
  }

  // Try to find export files in .nordpass directory
  const nordpassDir = path.join(process.env.HOME || "", ".nordpass");
  const autoDetected = findNordPassExportInDirectory(nordpassDir);
  if (autoDetected) {
    return autoDetected;
  }

  return null;
}

/**
 * Get the cache file path in Raycast's support directory
 */
export function getCacheFilePath(): string {
  return path.join(environment.supportPath, "nordpass-cache.json");
}

/**
 * Suggest secure locations for storing the export file
 * Returns paths that are more secure than Downloads/Desktop
 */
export function getSecureStorageSuggestions(): string[] {
  const home = process.env.HOME || "";
  return [
    path.join(home, ".nordpass", "export.csv"), // Hidden directory
    path.join(home, "Documents", ".secure", "nordpass-export.csv"), // Hidden secure folder
    path.join(home, "Library", "Application Support", "NordPass", "export.csv"), // Application support directory
  ];
}

/**
 * Set secure file permissions on export file (if it exists)
 * This restricts access to the file owner only
 */
export function secureExportFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      // Set permissions to 600 (rw-------): owner read/write, no access for others
      fs.chmodSync(filePath, 0o600);
    }
  } catch (error) {
    // If setting permissions fails, log but don't throw
    console.warn("Could not set secure permissions on export file:", error);
  }
}

/**
 * Check if export file exists
 */
export function exportFileExists(filePath?: string): boolean {
  const pathToCheck = filePath || getExportFilePath();
  if (!pathToCheck) return false;
  const expandedPath = expandTilde(pathToCheck);
  return fs.existsSync(expandedPath);
}
