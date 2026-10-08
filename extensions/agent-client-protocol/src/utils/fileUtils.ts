/**
 * File Utilities
 * Provides utilities for file path validation, language detection, and security checks
 */

import * as path from "path";

/**
 * Language mapping from file extensions
 */
const LANGUAGE_MAP: Record<string, string> = {
  // TypeScript / JavaScript
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",

  // Python
  py: "python",
  pyi: "python",
  pyc: "python",

  // Go
  go: "go",

  // Rust
  rs: "rust",

  // Java
  java: "java",
  kt: "kotlin",
  kts: "kotlin",

  // C/C++
  c: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  h: "c",
  hpp: "cpp",

  // Web
  html: "html",
  htm: "html",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",

  // Shell
  sh: "bash",
  bash: "bash",
  zsh: "bash",

  // Config formats
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",

  // Markdown / Text
  md: "markdown",
  mdx: "markdown",
  txt: "text",

  // Ruby
  rb: "ruby",

  // PHP
  php: "php",

  // Swift
  swift: "swift",

  // SQL
  sql: "sql",

  // Docker
  dockerfile: "dockerfile",
};

/**
 * Check if a path is absolute
 */
export function isAbsolutePath(filePath: string): boolean {
  // Handle Unix-style absolute paths
  if (filePath.startsWith("/")) {
    return true;
  }

  // Handle Windows-style absolute paths (C:\, D:\, etc.)
  if (/^[A-Za-z]:\\/.test(filePath)) {
    return true;
  }

  return false;
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext ? ext.slice(1).toLowerCase() : "";
}

/**
 * Detect programming language from file path
 */
export function detectLanguage(filePath: string): string {
  const ext = getFileExtension(filePath);

  if (!ext) {
    return "text";
  }

  return LANGUAGE_MAP[ext] || "text";
}

/**
 * Validate file path for security and correctness
 * @throws {Error} if path is invalid
 */
export function validateFilePath(filePath: string): void {
  // Check if path is empty
  if (!filePath || filePath.trim().length === 0) {
    throw new Error("Path cannot be empty");
  }

  // Check if path is absolute
  if (!isAbsolutePath(filePath)) {
    throw new Error("Path must be absolute");
  }

  // Check for path traversal patterns before normalization
  if (filePath.includes("..")) {
    const normalizedPath = path.normalize(filePath);
    // Check if normalization significantly reduced the path length (traversal detected)
    const segments = filePath.split(path.sep).length;
    const normalizedSegments = normalizedPath.split(path.sep).length;

    // If path components were removed, it's likely a traversal attempt
    if (normalizedSegments < segments - 1) {
      throw new Error("Invalid path: path traversal detected");
    }

    // Additional check: if normalized path contains .. it couldn't be resolved
    if (normalizedPath.includes("..")) {
      throw new Error("Invalid path: path traversal detected");
    }
  }

  // Check for null bytes
  if (filePath.includes("\x00")) {
    throw new Error("Invalid path: contains null byte");
  }

  // Additional security checks for suspicious patterns
  const suspiciousPatterns = [
    /\|/, // Pipe characters
    /;/, // Command separators
    /`/, // Backticks for command substitution
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filePath)) {
      throw new Error("Invalid path: contains suspicious characters");
    }
  }
}

/**
 * Sanitize and normalize file path
 */
export function sanitizeFilePath(filePath: string): string {
  // Normalize path (resolve . and ..)
  let sanitized = path.normalize(filePath);

  // Remove trailing slashes
  sanitized = sanitized.replace(/\/+$/, "");

  // Replace multiple consecutive slashes with single slash
  sanitized = sanitized.replace(/\/+/g, "/");

  return sanitized;
}

/**
 * Check if a file path is within allowed directories
 * @param filePath The file path to check
 * @param allowedDirectories List of allowed directory prefixes
 * @returns true if path is allowed (or no restrictions), false otherwise
 */
export function isWithinAllowedDirectory(filePath: string, allowedDirectories: string[]): boolean {
  // If no restrictions, allow all paths
  if (!allowedDirectories || allowedDirectories.length === 0) {
    return true;
  }

  // Normalize paths for comparison
  const normalizedPath = sanitizeFilePath(filePath);

  for (const allowedDir of allowedDirectories) {
    const normalizedDir = sanitizeFilePath(allowedDir);

    // Check if file path starts with allowed directory
    if (normalizedPath === normalizedDir || normalizedPath.startsWith(normalizedDir + "/")) {
      return true;
    }
  }

  return false;
}

/**
 * Get safe file name from path (for display purposes)
 */
export function getSafeFileName(filePath: string): string {
  return path.basename(filePath);
}

/**
 * Get parent directory from path
 */
export function getParentDirectory(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Check if path appears to be a directory (ends with /)
 */
export function isDirectoryPath(filePath: string): boolean {
  return filePath.endsWith("/") || filePath.endsWith("\\");
}

/**
 * Truncate content to maximum size
 */
export function truncateContent(content: string, maxSize: number): { content: string; isTruncated: boolean } {
  if (content.length <= maxSize) {
    return { content, isTruncated: false };
  }

  return {
    content: content.slice(0, maxSize) + "\n... (truncated)",
    isTruncated: true,
  };
}
