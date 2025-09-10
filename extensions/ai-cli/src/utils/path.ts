import { existsSync, statSync } from "fs";
import { FILE_PERMISSIONS } from "@/constants";

/**
 * Expands tilde (~) in file paths to the user's home directory.
 * @param path - The path string that may contain a tilde
 * @returns The expanded path with tilde replaced by home directory
 */
export function expandPath(path: string): string {
  if (!path || typeof path !== "string") {
    return "";
  }
  return path.replace(/^~/, process.env.HOME || "");
}

/**
 * Validates that a file path points to an executable file.
 *
 * @param path - The path to validate
 * @returns Validation result with valid status and optional error/warning messages
 */
export function validateExecutablePath(path: string): {
  valid: boolean;
  error?: string;
  warning?: string;
} {
  try {
    const expandedPath = expandPath(path);

    // Check if file exists
    if (!existsSync(expandedPath)) {
      return {
        valid: false,
        error: `Executable not found at path: ${path}. Please check the path in preferences.`,
      };
    }

    // Check if it's a file (not a directory)
    const stats = statSync(expandedPath);
    if (!stats.isFile()) {
      return {
        valid: false,
        error: `Path is not a file: ${path}`,
      };
    }

    // Check executable permissions on Unix systems
    try {
      const mode = stats.mode;
      const isExecutable = !!(
        mode & FILE_PERMISSIONS.EXECUTE_OTHER ||
        mode & FILE_PERMISSIONS.EXECUTE_GROUP ||
        mode & FILE_PERMISSIONS.EXECUTE_OWNER
      );

      if (!isExecutable) {
        return {
          valid: false,
          error: `File is not executable: ${path}`,
        };
      }
    } catch {
      // If we can't check permissions, we'll let the execution handle the error
      // This is a non-fatal condition
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Cannot access path: ${path}. ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
