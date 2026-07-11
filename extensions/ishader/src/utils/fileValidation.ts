import fs from "fs";
import path from "path";

/**
 * File validation and sanitization utilities
 * Ensures safe file operations in local Raycast extension
 */

// Maximum allowed file size: 50 MB (for images this is reasonable)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Maximum image dimensions (to prevent memory issues)
export const MAX_IMAGE_WIDTH = 10000;
export const MAX_IMAGE_HEIGHT = 10000;

// Allowed image extensions
export const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];

/**
 * Sanitizes filename by removing/replacing dangerous characters
 * Allows: letters, numbers, spaces, hyphens, underscores, dots
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return "image";

  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, "");

  // Remove directory separators
  sanitized = sanitized.replace(/[/\\]/g, "");

  // Keep only safe characters: alphanumeric, spaces, hyphens, underscores, dots
  // Allow unicode characters for international filenames
  // Remove Windows reserved characters and control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, "");

  // Remove leading/trailing dots and spaces (Windows doesn't like these)
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");

  // Ensure filename is not empty
  if (!sanitized || sanitized.trim().length === 0) {
    sanitized = "image";
  }

  // Limit filename length (Windows has 255 char limit, be safe with 200)
  if (sanitized.length > 200) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.slice(0, 200 - ext.length);
    sanitized = nameWithoutExt + ext;
  }

  return sanitized;
}

/**
 * Validates that a path is safe (no path traversal)
 * Ensures the resolved path stays within the allowed directory
 */
export function validatePathSafety(filePath: string, allowedBasePath: string): boolean {
  try {
    // Resolve both paths to absolute paths
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(allowedBasePath);

    // Check if resolved path starts with base path
    // This prevents path traversal (../../../etc/passwd)
    return resolvedPath.startsWith(resolvedBase);
  } catch {
    return false;
  }
}

/**
 * Validates file size
 */
export function validateFileSize(
  filePath: string,
  maxSize: number = MAX_FILE_SIZE,
): {
  valid: boolean;
  size?: number;
  error?: string;
} {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: "File does not exist" };
    }

    const stats = fs.statSync(filePath);
    const size = stats.size;

    if (size > maxSize) {
      return {
        valid: false,
        size,
        error: `File size (${formatFileSize(size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`,
      };
    }

    return { valid: true, size };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to check file size",
    };
  }
}

/**
 * Validates image file extension
 */
export function validateImageExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Validates that file exists and is a regular file (not directory)
 */
export function validateFileExists(filePath: string): {
  valid: boolean;
  error?: string;
} {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: "File does not exist" };
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return { valid: false, error: "Path is not a file" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to check file",
    };
  }
}

/**
 * Comprehensive file validation for image processing
 */
export function validateImageFile(filePath: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if file exists
  const existsCheck = validateFileExists(filePath);
  if (!existsCheck.valid) {
    errors.push(existsCheck.error || "File validation failed");
    return { valid: false, errors };
  }

  // Check file extension
  if (!validateImageExtension(filePath)) {
    errors.push(`File must be one of: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`);
  }

  // Check file size
  const sizeCheck = validateFileSize(filePath);
  if (!sizeCheck.valid) {
    errors.push(sizeCheck.error || "File size validation failed");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Validates image dimensions
 */
export function validateImageDimensions(imageWidth: number, imageHeight: number): { valid: boolean; error?: string } {
  if (imageWidth > MAX_IMAGE_WIDTH || imageHeight > MAX_IMAGE_HEIGHT) {
    return {
      valid: false,
      error: `Image dimensions (${imageWidth}x${imageHeight}) exceed maximum allowed (${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT})`,
    };
  }

  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      valid: false,
      error: "Invalid image dimensions",
    };
  }

  return { valid: true };
}
