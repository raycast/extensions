import { resolve, normalize, isAbsolute } from "path";
import { existsSync, statSync } from "fs";

export interface PathValidationResult {
  isValid: boolean;
  sanitizedPath?: string;
  error?: string;
}

/**
 * Sanitizes and validates a file system path
 */
export function sanitizePath(inputPath: string): PathValidationResult {
  if (!inputPath || typeof inputPath !== "string") {
    return {
      isValid: false,
      error: "Path must be a non-empty string"
    };
  }

  const trimmedPath = inputPath.trim();
  if (!trimmedPath) {
    return {
      isValid: false,
      error: "Path cannot be empty or whitespace only"
    };
  }

  try {
    // Check for path traversal attempts
    if (trimmedPath.includes("..") || trimmedPath.includes("~")) {
      return {
        isValid: false,
        error: "Path contains potentially dangerous characters"
      };
    }

    // Check for null bytes (security vulnerability)
    if (trimmedPath.includes("\0")) {
      return {
        isValid: false,
        error: "Path contains null bytes"
      };
    }

    // Normalize the path to remove redundant separators and resolve relative paths
    const normalizedPath = normalize(trimmedPath);
    
    // Convert to absolute path if it's not already
    const absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(normalizedPath);

    // Additional security check: ensure the resolved path doesn't escape expected boundaries
    // This is a basic check - in production you might want more sophisticated sandbox validation
    if (absolutePath.length > 4096) { // Reasonable path length limit
      return {
        isValid: false,
        error: "Path is too long"
      };
    }

    return {
      isValid: true,
      sanitizedPath: absolutePath
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid path format: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Validates that a path exists and is accessible
 */
export function validatePathExists(path: string): PathValidationResult {
  const sanitizationResult = sanitizePath(path);
  if (!sanitizationResult.isValid) {
    return sanitizationResult;
  }

  const sanitizedPath = sanitizationResult.sanitizedPath!;

  try {
    if (!existsSync(sanitizedPath)) {
      return {
        isValid: false,
        error: "Path does not exist"
      };
    }

    const stats = statSync(sanitizedPath);
    if (!stats.isDirectory()) {
      return {
        isValid: false,
        error: "Path is not a directory"
      };
    }

    return {
      isValid: true,
      sanitizedPath
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Cannot access path: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Validates a Laravel project path
 */
export function validateLaravelProjectPath(path: string): PathValidationResult {
  const existsResult = validatePathExists(path);
  if (!existsResult.isValid) {
    return existsResult;
  }

  const sanitizedPath = existsResult.sanitizedPath!;

  try {
    // Check for artisan file
    const artisanPath = resolve(sanitizedPath, "artisan");
    if (!existsSync(artisanPath)) {
      return {
        isValid: false,
        error: "Directory is not a Laravel project (missing artisan file)"
      };
    }

    return {
      isValid: true,
      sanitizedPath
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Cannot validate Laravel project: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Sanitizes a project name for safe storage
 */
export function sanitizeProjectName(name: string): PathValidationResult {
  if (!name || typeof name !== "string") {
    return {
      isValid: false,
      error: "Project name must be a non-empty string"
    };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return {
      isValid: false,
      error: "Project name cannot be empty or whitespace only"
    };
  }

  // Check for invalid characters in project names
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    return {
      isValid: false,
      error: "Project name contains invalid characters"
    };
  }

  // Check length limits
  if (trimmedName.length > 255) {
    return {
      isValid: false,
      error: "Project name is too long (max 255 characters)"
    };
  }

  // Reserved names (Windows)
  const reservedNames = [
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
  ];
  
  if (reservedNames.includes(trimmedName.toUpperCase())) {
    return {
      isValid: false,
      error: "Project name is reserved by the system"
    };
  }

  return {
    isValid: true,
    sanitizedPath: trimmedName
  };
}