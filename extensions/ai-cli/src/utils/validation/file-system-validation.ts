import { existsSync, statSync } from "fs";
import { messages } from "@/locale/en/messages";
import { formatFileSystemError } from "../message-formatting";
import { expandPath } from "../path";

/**
 * File system validation utilities for directory paths and configuration validation.
 */

/**
 * Creates a validated file path for type safety
 */
export const createFilePath = (path: string): string => path;

/**
 * Validates target folder path for form validation with empty path support.
 */
export function validateTargetFolder(dirPath: string | undefined): string | undefined {
  // Allow empty paths (will use default working directory)
  if (!dirPath || dirPath.trim().length === 0) {
    return undefined;
  }

  // Expand tilde in path
  const expandedPath = expandPath(dirPath);

  try {
    if (!existsSync(expandedPath)) {
      return formatFileSystemError(messages.validation.targetFolderNotExists, dirPath);
    }

    if (!statSync(expandedPath).isDirectory()) {
      return formatFileSystemError(messages.validation.targetFolderInvalid, dirPath);
    }

    return undefined;
  } catch {
    return formatFileSystemError(messages.validation.targetFolderNotAccessible, dirPath);
  }
}

/**
 * Validates directory path existence and accessibility with error handling.
 */
export function validateDirectory(dirPath: string): { valid: boolean; error?: string } {
  try {
    if (!existsSync(dirPath)) {
      return {
        valid: false,
        error: formatFileSystemError(messages.validation.directoryNotExists, dirPath),
      };
    }

    if (!statSync(dirPath).isDirectory()) {
      return {
        valid: false,
        error: formatFileSystemError(messages.validation.pathNotDirectory, dirPath),
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: formatFileSystemError(
        messages.validation.cannotAccessDirectory,
        dirPath,
        error instanceof Error ? error.message : String(error)
      ),
    };
  }
}
