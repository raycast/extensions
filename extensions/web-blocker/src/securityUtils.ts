/**
 * Security utilities for safe shell command execution
 */

/**
 * Escapes a string for safe use in shell commands
 * Uses proper shell escaping to prevent command injection
 */
export function escapeShellArg(arg: string): string {
  if (!arg || typeof arg !== "string") {
    return "''";
  }
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Validates IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  if (!ip || typeof ip !== "string") {
    return false;
  }
  const parts = ip.trim().split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Validates IPv6 address format
 * More strict than the previous regex - ensures proper IPv6 format
 */
export function isValidIPv6(ip: string): boolean {
  if (!ip || typeof ip !== "string") {
    return false;
  }
  const trimmed = ip.trim();

  // Basic structure check - must contain colons and hex digits
  if (!trimmed.match(/^[0-9a-fA-F:]+$/)) {
    return false;
  }

  // Cannot be only colons
  if (trimmed.match(/^:+$/)) {
    return false;
  }

  // Check for valid IPv6 patterns:
  // - Full format: xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx
  // - Compressed format with :: (can only appear once)
  // - IPv4-mapped: ::ffff:192.168.1.1

  const doubleColonCount = (trimmed.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    return false;
  }

  // Split by : and validate each segment
  const parts = trimmed.split(":");
  if (parts.length > 8) {
    return false;
  }

  // Check each part (except empty parts from ::)
  for (const part of parts) {
    if (part === "") continue; // Empty part from ::
    if (part.length > 4) {
      return false;
    }
    if (!part.match(/^[0-9a-fA-F]{1,4}$/)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

/**
 * Validates and sanitizes a domain name for use in shell commands
 * Returns empty string if invalid
 */
export function sanitizeDomainForShell(domain: string): string {
  if (!domain || typeof domain !== "string") {
    return "";
  }

  // Basic domain validation - only allow alphanumeric, dots, hyphens
  // Must match domain name format
  const sanitized = domain.trim().toLowerCase();

  // Check for shell metacharacters that could be dangerous
  if (/[;&|`$(){}[\]<>\\\n\r\t]/.test(sanitized)) {
    return "";
  }

  // Basic domain format check
  if (
    !sanitized.match(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/,
    )
  ) {
    return "";
  }

  // Additional checks
  if (sanitized.startsWith(".") || sanitized.endsWith(".")) {
    return "";
  }
  if (sanitized.includes("..")) {
    return "";
  }
  if (sanitized.length > 253) {
    return "";
  }

  return sanitized;
}
