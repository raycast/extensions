/**
 * Validates and returns a safe port number string.
 * Prevents command injection via port parameter.
 */
export function safePort(port: string | undefined, fallback = "1080"): string {
  const num = parseInt(port || fallback, 10);
  if (isNaN(num) || num < 1 || num > 65535) return fallback;
  return String(num);
}

/**
 * Validates that a string is a safe shell argument (alphanumeric, dots, hyphens, underscores, slashes).
 * Use for session names, config names, hostnames, etc.
 */
export function sanitizeShellArg(value: string): string {
  return value.replace(/[^a-zA-Z0-9._\-/]/g, "");
}

/**
 * Shell-escapes a string by wrapping in single quotes.
 */
export function shellEscape(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}
