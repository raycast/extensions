/**
 * Utility functions for file path operations
 */
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Validate that an executable exists at the given path
 * @param execPath Path to check
 * @returns true if valid, throws error otherwise
 */
export function validateExecutablePath(execPath: string): boolean {
  if (!fs.existsSync(execPath)) {
    throw new Error(
      `Qutebrowser executable not found at "${execPath}". Please check the path in preferences or install qutebrowser.`,
    );
  }
  return true;
}

/**
 * Common session file paths for qutebrowser
 */
export const SESSION_FILE_PATHS = [
  path.join(os.homedir(), "Library", "Application Support", "qutebrowser", "sessions", "_autosave.yml"),
  path.join(os.homedir(), ".qutebrowser", "sessions", "_autosave.yml"),
  path.join(os.homedir(), ".local", "share", "qutebrowser", "sessions", "_autosave.yml"),
];
