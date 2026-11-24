import { basename, dirname, resolve } from "path";

/**
 * Safely validate and sanitize filename to prevent path traversal attacks
 */
export function validateAndSanitizeFilename(filename: string): string {
  // Remove any path traversal sequences
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename: path traversal sequences are not allowed");
  }

  // Use basename to ensure only the filename is used
  const sanitized = basename(filename);

  // Ensure it's a .yaml file
  if (!sanitized.endsWith(".yaml") && !sanitized.endsWith(".yml")) {
    throw new Error("Invalid filename: must be a .yaml or .yml file");
  }

  // Additional character validation
  if (!/^[a-zA-Z0-9._-]+\.(yaml|yml)$/.test(sanitized)) {
    throw new Error(
      "Invalid filename: contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores.",
    );
  }

  return sanitized;
}

/**
 * Validate that the resolved path is a file directly inside `directory`. The directory itself is the user's
 * choice (the Export Directory preference), so it may be anywhere, including an external drive.
 */
export function validatePathInDirectory(filePath: string, directory: string): void {
  if (dirname(resolve(filePath)) !== resolve(directory)) {
    throw new Error("Security error: file path must be inside the export directory");
  }
}
