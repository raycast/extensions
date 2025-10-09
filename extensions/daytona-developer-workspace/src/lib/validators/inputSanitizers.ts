/**
 * Input sanitization utilities
 * Clean and normalize user input data
 */

/**
 * Sanitize string input by trimming and normalizing
 */
export function sanitizeString(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input).trim().replace(/\s+/g, " ");
}

/**
 * Sanitize sandbox name to ensure it meets requirements
 */
export function sanitizeSandboxName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-") // Replace invalid characters with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Sanitize repository URL
 */
export function sanitizeRepositoryUrl(url: string): string {
  const trimmed = url.trim();

  // Add https:// if no protocol specified
  if (!/^https?:\/\/|^git@/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
  return path
    .replace(/\.\./g, "") // Remove parent directory references
    .replace(/\/+/g, "/") // Normalize multiple slashes
    .replace(/^\//, "") // Remove leading slash
    .trim();
}

/**
 * Sanitize code input for execution
 */
export function sanitizeCode(code: string): string {
  return code
    .trim()
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n");
}

/**
 * Sanitize and validate JSON input
 */
export function sanitizeJson(jsonString: string): { valid: boolean; sanitized: string; error?: string } {
  try {
    const trimmed = jsonString.trim();
    const parsed = JSON.parse(trimmed);
    const sanitized = JSON.stringify(parsed, null, 2);
    return { valid: true, sanitized };
  } catch (error) {
    return {
      valid: false,
      sanitized: jsonString.trim(),
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
  input: unknown,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    fallback?: number;
  } = {},
): number {
  const { min, max, integer = false, fallback = 0 } = options;

  let num = Number(input);

  if (isNaN(num)) return fallback;

  if (integer) num = Math.round(num);
  if (min !== undefined) num = Math.max(num, min);
  if (max !== undefined) num = Math.min(num, max);

  return num;
}

/**
 * Sanitize branch name
 */
export function sanitizeBranchName(branch: string): string {
  return branch
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "") // Remove invalid characters
    .replace(/^\/|\/$/g, "") // Remove leading/trailing slashes
    .substring(0, 100); // Limit length
}

/**
 * Sanitize commit message
 */
export function sanitizeCommitMessage(message: string): string {
  return message
    .trim()
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n")
    .substring(0, 500); // Reasonable limit for commit messages
}

/**
 * Sanitize environment variable key
 */
export function sanitizeEnvKey(key: string): string {
  return key
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_") // Only allow alphanumeric and underscore
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Sanitize environment variable value
 */
export function sanitizeEnvValue(value: string): string {
  return value.trim().replace(/[\r\n]/g, ""); // Remove line breaks
}

/**
 * Remove potentially dangerous characters from strings
 */
export function removeDangerousChars(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/[;&|`$]/g, "") // Remove shell command injection chars
    .trim();
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, " ") // Normalize spaces
    .substring(0, 100); // Limit length
}

/**
 * Sanitize tag names
 */
export function sanitizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "") // Only alphanumeric and hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 30); // Limit length
}

/**
 * Sanitize port numbers
 */
export function sanitizePort(port: unknown): number | null {
  const num = Number(port);
  if (isNaN(num) || num < 1 || num > 65535 || !Number.isInteger(num)) {
    return null;
  }
  return num;
}

/**
 * Sanitize timeout values (in milliseconds)
 */
export function sanitizeTimeout(timeout: unknown): number {
  const num = sanitizeNumber(timeout, {
    min: 1000, // Minimum 1 second
    max: 3600000, // Maximum 1 hour
    integer: true,
    fallback: 30000, // Default 30 seconds
  });
  return num;
}

/**
 * Sanitize file size limits (in bytes)
 */
export function sanitizeFileSize(size: unknown): number {
  return sanitizeNumber(size, {
    min: 0,
    max: 100 * 1024 * 1024, // 100MB max
    integer: true,
    fallback: 10 * 1024 * 1024, // 10MB default
  });
}

/**
 * Sanitize and validate array input
 */
export function sanitizeArray<T>(input: unknown, itemSanitizer: (item: unknown) => T, maxLength = 100): T[] {
  if (!Array.isArray(input)) return [];

  return input
    .slice(0, maxLength)
    .map(itemSanitizer)
    .filter((item) => item !== null && item !== undefined);
}

/**
 * Sanitize object by applying sanitizers to each property
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  input: unknown,
  sanitizers: Partial<Record<keyof T, (value: unknown) => T[keyof T]>>,
): Partial<T> {
  if (typeof input !== "object" || input === null) return {};

  const obj = input as Record<string, unknown>;
  const result: Partial<T> = {};

  for (const [key, sanitizer] of Object.entries(sanitizers)) {
    if (key in obj && sanitizer) {
      result[key as keyof T] = sanitizer(obj[key]);
    }
  }

  return result;
}
