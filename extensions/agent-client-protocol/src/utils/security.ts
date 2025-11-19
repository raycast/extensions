/**
 * Security Utilities
 *
 * Provides security hardening for file access, agent communication,
 * and data validation to protect against malicious activities.
 */

import { createLogger } from "./logging";
import * as path from "path";
import * as os from "os";

const logger = createLogger("Security");

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  isValid: boolean;
  reason?: string;
  sanitized?: string;
}

/**
 * Path security check options
 */
export interface PathSecurityOptions {
  allowedDirectories?: string[];
  blockedDirectories?: string[];
  maxPathLength?: number;
  allowSymlinks?: boolean;
  allowHiddenFiles?: boolean;
}

/**
 * Default blocked directories for security
 */
const DEFAULT_BLOCKED_DIRECTORIES = [
  "/etc",
  "/var",
  "/usr/bin",
  "/usr/sbin",
  "/bin",
  "/sbin",
  "/System",
  "/Library/SystemExtensions",
  path.join(os.homedir(), ".ssh"),
  path.join(os.homedir(), ".aws"),
  path.join(os.homedir(), ".gnupg"),
];

/**
 * Sensitive file patterns to block
 */
const SENSITIVE_FILE_PATTERNS = [
  /\.ssh\/.*$/,
  /\.aws\/credentials$/,
  /\.env$/,
  /\.env\.local$/,
  /\.env\.production$/,
  /secrets\.ya?ml$/,
  /credentials\.json$/,
  /\.kube\/config$/,
  /\.docker\/config\.json$/,
  /keychain/i,
  /password/i,
  /private[_-]?key/i,
  /api[_-]?key/i,
];

/**
 * Validate file path for security
 */
export function validateFilePath(filePath: string, options: PathSecurityOptions = {}): SecurityValidationResult {
  try {
    // Normalize and resolve path
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(normalizedPath);

    // Check path length
    const maxLength = options.maxPathLength ?? 1024;
    if (resolvedPath.length > maxLength) {
      return {
        isValid: false,
        reason: `Path exceeds maximum length of ${maxLength} characters`,
      };
    }

    // Check for path traversal attempts
    if (filePath.includes("..") && !resolvedPath.startsWith(process.cwd())) {
      logger.warn("Path traversal attempt detected", { filePath, resolvedPath });
      return {
        isValid: false,
        reason: "Path traversal not allowed",
      };
    }

    // Check hidden files if not allowed
    if (!options.allowHiddenFiles) {
      const basename = path.basename(resolvedPath);
      if (basename.startsWith(".")) {
        return {
          isValid: false,
          reason: "Hidden files not allowed",
        };
      }
    }

    // Check against blocked directories
    const blockedDirs = [...DEFAULT_BLOCKED_DIRECTORIES, ...(options.blockedDirectories ?? [])];

    for (const blockedDir of blockedDirs) {
      if (resolvedPath.startsWith(blockedDir)) {
        logger.warn("Blocked directory access attempt", {
          filePath,
          resolvedPath,
          blockedDir,
        });
        return {
          isValid: false,
          reason: `Access to ${blockedDir} is not allowed`,
        };
      }
    }

    // Check against sensitive file patterns
    for (const pattern of SENSITIVE_FILE_PATTERNS) {
      if (pattern.test(resolvedPath)) {
        logger.warn("Sensitive file access attempt", {
          filePath,
          resolvedPath,
          pattern: pattern.source,
        });
        return {
          isValid: false,
          reason: "Access to sensitive files is not allowed",
        };
      }
    }

    // Check allowed directories if specified
    if (options.allowedDirectories && options.allowedDirectories.length > 0) {
      const isAllowed = options.allowedDirectories.some((allowedDir) => resolvedPath.startsWith(allowedDir));

      if (!isAllowed) {
        return {
          isValid: false,
          reason: "Path is not in allowed directories",
        };
      }
    }

    return {
      isValid: true,
      sanitized: resolvedPath,
    };
  } catch (error) {
    logger.error("Path validation error", { filePath, error });
    return {
      isValid: false,
      reason: "Invalid path format",
    };
  }
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string, maxLength: number = 10000): string {
  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes and disallowed control characters
  sanitized = sanitized
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      if (code === 0) {
        return false;
      }

      if (code < 32 || code === 127) {
        // Allow newline, carriage return, and tab
        return code === 10 || code === 13 || code === 9;
      }

      return true;
    })
    .join("");

  return sanitized;
}

/**
 * Validate agent configuration for security
 */
export function validateAgentConfig(config: {
  command?: string;
  args?: string[];
  endpoint?: string;
  environmentVariables?: Record<string, string>;
}): SecurityValidationResult {
  // Check command execution
  if (config.command) {
    // Block potentially dangerous commands
    const dangerousCommands = ["rm", "dd", "mkfs", "format", "fdisk"];
    const commandBasename = path.basename(config.command);

    if (dangerousCommands.includes(commandBasename)) {
      logger.warn("Dangerous command blocked", { command: config.command });
      return {
        isValid: false,
        reason: `Command '${commandBasename}' is not allowed for security reasons`,
      };
    }

    // Check for shell injection attempts
    if (config.command.includes("&") || config.command.includes("|")) {
      logger.warn("Shell injection attempt detected", { command: config.command });
      return {
        isValid: false,
        reason: "Shell operators not allowed in command",
      };
    }
  }

  // Validate arguments
  if (config.args) {
    for (const arg of config.args) {
      if (arg.includes("\0")) {
        logger.warn("Null byte in argument", { arg });
        return {
          isValid: false,
          reason: "Invalid argument format",
        };
      }
    }
  }

  // Validate endpoint URL
  if (config.endpoint) {
    try {
      const url = new URL(config.endpoint);

      // Only allow http, https, ws, wss protocols
      if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
        logger.warn("Invalid endpoint protocol", { endpoint: config.endpoint });
        return {
          isValid: false,
          reason: "Endpoint must use http, https, ws, or wss protocol",
        };
      }

      // Block localhost connections to non-standard ports in production
      if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && process.env.NODE_ENV === "production") {
        const port = parseInt(url.port);
        const standardPorts = [80, 443, 8080, 3000];
        if (port && !standardPorts.includes(port)) {
          logger.warn("Non-standard localhost port in production", {
            endpoint: config.endpoint,
          });
          return {
            isValid: false,
            reason: "Non-standard localhost ports not allowed in production",
          };
        }
      }
    } catch (error) {
      logger.error("Invalid endpoint URL", { endpoint: config.endpoint, error });
      return {
        isValid: false,
        reason: "Invalid endpoint URL format",
      };
    }
  }

  // Validate environment variables
  if (config.environmentVariables) {
    for (const [key, value] of Object.entries(config.environmentVariables)) {
      // Block sensitive environment variables
      const sensitiveKeys = ["PATH", "LD_LIBRARY_PATH", "DYLD_LIBRARY_PATH", "LD_PRELOAD"];

      if (sensitiveKeys.includes(key.toUpperCase())) {
        logger.warn("Sensitive environment variable blocked", { key });
        return {
          isValid: false,
          reason: `Environment variable '${key}' is not allowed`,
        };
      }

      // Validate no null bytes
      if (key.includes("\0") || value.includes("\0")) {
        return {
          isValid: false,
          reason: "Invalid environment variable format",
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Rate limiter for preventing abuse
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000,
  ) {}

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    const requests = this.requests.get(key) ?? [];

    // Filter out old requests outside the window
    const recentRequests = requests.filter((time) => time > windowStart);

    // Check if rate limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      logger.warn("Rate limit exceeded", {
        key,
        requests: recentRequests.length,
        maxRequests: this.maxRequests,
      });
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter((time) => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

/**
 * Content security scanner
 */
export function scanContentForSecrets(content: string): {
  hasSecrets: boolean;
  matches: string[];
} {
  const secretPatterns = [
    // API Keys
    /api[_-]?key[_-]?[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
    // Private keys
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
    // AWS Keys
    /AKIA[0-9A-Z]{16}/gi,
    // Passwords in code
    /password[_-]?[:=]\s*["']([^"']{8,})["']/gi,
    // Bearer tokens
    /bearer\s+[a-zA-Z0-9_.-]{20,}/gi,
    // Database URLs with passwords
    /(?:postgresql|mysql|mongodb):\/\/[^:]+:([^@]+)@/gi,
  ];

  const matches: string[] = [];

  for (const pattern of secretPatterns) {
    const found = content.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  if (matches.length > 0) {
    logger.warn("Potential secrets detected in content", {
      matchCount: matches.length,
    });
  }

  return {
    hasSecrets: matches.length > 0,
    matches,
  };
}

/**
 * Validate file size before reading
 */
export function validateFileSize(sizeBytes: number, maxSizeMB: number = 10): SecurityValidationResult {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (sizeBytes > maxBytes) {
    return {
      isValid: false,
      reason: `File size (${(sizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Create a global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter(100, 60000);

// Cleanup rate limiter periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    globalRateLimiter.cleanup();
  }, 60000);
}
