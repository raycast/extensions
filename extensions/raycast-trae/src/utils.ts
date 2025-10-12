/**
 * Utility functions for Trae Raycast Extension
 */

import { existsSync } from "node:fs";

/**
 * Common Trae installation paths on macOS
 */
export const TRAE_COMMON_PATHS = [
  "/Applications/Trae.app/Contents/MacOS/Electron",
  "/Applications/Trae.app/Contents/MacOS/Trae",
  "/Applications/Trae.app/Contents/MacOS/Trae.exe",
  "/Applications/Trae CN.app/Contents/MacOS/Electron",
  "/Applications/Trae CN.app/Contents/MacOS/Trae",
  "/Applications/Trae CN.app/Contents/MacOS/Trae CN",
] as const;

/**
 * Check if Trae is installed in common locations
 */
export function isTraeInstalled(): boolean {
  return TRAE_COMMON_PATHS.some((path) => existsSync(path));
}

/**
 * Get the first existing Trae installation path
 */
export function getFirstTraePath(): string | null {
  for (const path of TRAE_COMMON_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Validate if a path exists and points to a valid Trae executable
 */
export function validateTraePath(path: string): boolean {
  if (!path) return false;

  // Basic validation - check if file exists
  if (!existsSync(path)) {
    return false;
  }

  // Additional validation could include:
  // - Checking if it's an executable file
  // - Verifying it's actually a Trae binary
  // - Checking file permissions

  return true;
}

/**
 * Format file path for display in toast messages
 */
export function formatPathForDisplay(path: string, maxLength = 50): string {
  if (path.length <= maxLength) {
    return path;
  }

  // Truncate middle of path
  const startLength = Math.floor(maxLength / 2) - 2;
  const endLength = Math.ceil(maxLength / 2) - 2;

  return `${path.substring(0, startLength)}...${path.substring(path.length - endLength)}`;
}
