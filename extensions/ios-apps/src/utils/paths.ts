import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";
import { resolve, normalize, join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../types";

// Get preferences
export const preferences = getPreferenceValues<ExtensionPreferences>();

// Define the path to ipatool, using the preference if available
export const IPATOOL_PATH =
  preferences.ipatoolPath || (process.arch === "arm64" ? "/opt/homebrew/bin/ipatool" : "/usr/local/bin/ipatool");

// Comprehensive path validation utilities

/**
 * Check if a path contains directory traversal attempts
 */
function containsTraversalAttempts(inputPath: string): boolean {
  if (!inputPath || typeof inputPath !== "string") {
    return false;
  }

  // Check for common traversal patterns
  const traversalPatterns = [
    /\.{2}/g, // Basic ..
    /%2e%2e/gi, // URL encoded ..
    /%2E%2E/gi, // URL encoded ..
    /\.{2}%2f/gi, // Mixed encoding
    /\.{2}%2F/gi, // Mixed encoding
    /%2e%2e%2f/gi, // Full URL encoded
    /%2E%2E%2F/gi, // Full URL encoded
    /\.{2}\//g, // Double dot with forward slash
    /\.{2}\\/g, // Double dot with backslash
  ];

  return traversalPatterns.some((pattern) => pattern.test(inputPath));
}

/**
 * Validate that a path stays within safe directory boundaries
 */
export function validateSafePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Invalid path: must be a non-empty string");
  }

  // Check for traversal attempts
  if (containsTraversalAttempts(inputPath)) {
    throw new Error(`Path contains directory traversal attempt: ${inputPath}`);
  }

  // Normalize and resolve the path
  const normalized = normalize(inputPath);
  const absolute = resolve(normalized);

  // Ensure path stays within safe boundaries
  const safeRoots = [homedir(), "/tmp", "/var/tmp", "/Users"];

  const isWithinSafeBoundary = safeRoots.some((root) => absolute.startsWith(resolve(root)));

  if (!isWithinSafeBoundary) {
    throw new Error(
      `Path is outside safe boundaries: ${absolute}. Allowed directories: home directory, /tmp, /var/tmp, /Users`,
    );
  }

  return absolute;
}

/**
 * Sanitize filename to prevent path injection
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    throw new Error("Invalid filename: must be a non-empty string");
  }

  return filename
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .substring(0, 255); // Limit length
}

/**
 * Create a safe directory path by validating each component
 */
export function createSafeDirectoryPath(baseDir: string, ...components: string[]): string {
  const safeBaseDir = validateSafePath(baseDir);
  const safeComponents = components.map(sanitizeFilename);
  const fullPath = join(safeBaseDir, ...safeComponents);
  return validateSafePath(fullPath);
}

/**
 * Enhanced path validation with comprehensive security checks
 */
export function validatePathSecurity(inputPath: string): string {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Invalid path: must be a non-empty string");
  }

  // Check for directory traversal attempts
  const dangerousPatterns = [
    "..", // Basic traversal
    "%2e%2e", // URL encoded ..
    "%2E%2E", // URL encoded .. (uppercase)
    "..%2f", // Mixed encoding
    "..%2F", // Mixed encoding (uppercase)
    "%2e%2e%2f", // Full URL encoded ../
    "%2E%2E%2F", // Full URL encoded ../ (uppercase)
    "....//", // Double dot variations
  ];

  const lowerPath = inputPath.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerPath.includes(pattern.toLowerCase())) {
      throw new Error(`Path contains unsafe directory traversal pattern: ${pattern}`);
    }
  }

  // Normalize and resolve the path
  let downloadPath = inputPath.startsWith("~") ? inputPath.replace("~", homedir()) : inputPath;
  downloadPath = resolve(normalize(downloadPath));

  // Ensure the resolved path is within safe boundaries
  const safePaths = [homedir(), "/tmp", "/var/tmp", "/Users"];

  const isWithinSafePath = safePaths.some((safePath) => {
    const resolvedSafePath = resolve(safePath);
    return downloadPath.startsWith(resolvedSafePath);
  });

  if (!isWithinSafePath) {
    throw new Error(
      `Path is outside safe boundaries: ${downloadPath}. Allowed directories: home directory, /tmp, /var/tmp, /Users`,
    );
  }

  return downloadPath;
}

// Get the downloads directory path from preferences or default to ~/Downloads
export function getDownloadsDirectory(): string {
  let downloadPath: string;

  if (preferences.downloadPath) {
    // Use the consolidated path validation
    downloadPath = validatePathSecurity(preferences.downloadPath);
  } else {
    downloadPath = join(homedir(), "Downloads");
  }

  // Ensure the directory exists
  if (!existsSync(downloadPath)) {
    mkdirSync(downloadPath, { recursive: true });
  }

  return downloadPath;
}
