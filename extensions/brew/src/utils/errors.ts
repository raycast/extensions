/**
 * Error types for the Brew extension.
 *
 * Provides granular error types for different failure scenarios:
 * - Network errors (transient, recoverable)
 * - Parse errors (corrupted data)
 * - Brew command errors (brew-specific failures)
 * - Brew lock errors (concurrent process detection)
 * - Cache errors (file system issues)
 */

/**
 * Base error class for all Brew extension errors.
 */
export class BrewError extends Error {
  readonly brewCause?: Error;

  constructor(message: string, options?: { cause?: Error }) {
    super(message);
    this.name = "BrewError";
    this.brewCause = options?.cause;
  }
}

/**
 * Network-related errors (HTTP failures, timeouts, etc.).
 * These are typically transient and recoverable.
 */
export class NetworkError extends BrewError {
  readonly statusCode?: number;
  readonly url?: string;

  constructor(message: string, options?: { cause?: Error; statusCode?: number; url?: string }) {
    super(message, { cause: options?.cause });
    this.name = "NetworkError";
    this.statusCode = options?.statusCode;
    this.url = options?.url;
  }
}

/**
 * Parse errors for corrupted or invalid data.
 */
export class ParseError extends BrewError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = "ParseError";
  }
}

/**
 * Brew command execution errors.
 */
export class BrewCommandError extends BrewError {
  readonly command?: string;
  readonly exitCode?: number;
  readonly stderr?: string;

  constructor(message: string, options?: { cause?: Error; command?: string; exitCode?: number; stderr?: string }) {
    super(message, { cause: options?.cause });
    this.name = "BrewCommandError";
    this.command = options?.command;
    this.exitCode = options?.exitCode;
    this.stderr = options?.stderr;
  }
}

/**
 * Error when brew executable is not found.
 */
export class BrewNotFoundError extends BrewError {
  readonly path?: string;

  constructor(message: string, options?: { cause?: Error; path?: string }) {
    super(message, { cause: options?.cause });
    this.name = "BrewNotFoundError";
    this.path = options?.path;
  }
}

/**
 * Cache-related errors (file system issues).
 */
export class CacheError extends BrewError {
  readonly path?: string;

  constructor(message: string, options?: { cause?: Error; path?: string }) {
    super(message, { cause: options?.cause });
    this.name = "CacheError";
    this.path = options?.path;
  }
}

/**
 * Error when another brew process is already running.
 * This is a recoverable error - the user can retry after the other process finishes.
 */
export class BrewLockError extends BrewError {
  readonly command?: string;

  constructor(message: string, options?: { cause?: Error; command?: string }) {
    super(message, { cause: options?.cause });
    this.name = "BrewLockError";
    this.command = options?.command;
  }
}

/**
 * Error when a download or operation times out.
 * This is a recoverable error - the user can retry.
 */
export class DownloadTimeoutError extends BrewError {
  readonly packageName?: string;
  readonly phase?: string;
  readonly timeoutMs?: number;
  readonly elapsedMs?: number;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      packageName?: string;
      phase?: string;
      timeoutMs?: number;
      elapsedMs?: number;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "DownloadTimeoutError";
    this.packageName = options?.packageName;
    this.phase = options?.phase;
    this.timeoutMs = options?.timeoutMs;
    this.elapsedMs = options?.elapsedMs;
  }
}

/**
 * Error when a brew process appears to be stale/stuck.
 * This happens when no progress is made for an extended period.
 */
export class StaleProcessError extends BrewError {
  readonly packageName?: string;
  readonly lastPhase?: string;
  readonly staleDurationMs?: number;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      packageName?: string;
      lastPhase?: string;
      staleDurationMs?: number;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "StaleProcessError";
    this.packageName = options?.packageName;
    this.lastPhase = options?.lastPhase;
    this.staleDurationMs = options?.staleDurationMs;
  }
}

/**
 * Error when a package is not found.
 */
export class PackageNotFoundError extends BrewError {
  readonly packageName?: string;
  readonly packageType?: "formula" | "cask";

  constructor(message: string, options?: { cause?: Error; packageName?: string; packageType?: "formula" | "cask" }) {
    super(message, { cause: options?.cause });
    this.name = "PackageNotFoundError";
    this.packageName = options?.packageName;
    this.packageType = options?.packageType;
  }
}

/**
 * Error when a package has been disabled/discontinued.
 * This is not recoverable - the package is no longer available.
 */
export class PackageDisabledError extends BrewError {
  readonly packageName?: string;
  readonly packageType?: "formula" | "cask";
  readonly disabledDate?: string;
  readonly reason?: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      packageName?: string;
      packageType?: "formula" | "cask";
      disabledDate?: string;
      reason?: string;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "PackageDisabledError";
    this.packageName = options?.packageName;
    this.packageType = options?.packageType;
    this.disabledDate = options?.disabledDate;
    this.reason = options?.reason;
  }
}

/**
 * Error when a package conflicts with another installed package.
 */
export class PackageConflictError extends BrewError {
  readonly packageName?: string;
  readonly conflictsWith?: string[];

  constructor(message: string, options?: { cause?: Error; packageName?: string; conflictsWith?: string[] }) {
    super(message, { cause: options?.cause });
    this.name = "PackageConflictError";
    this.packageName = options?.packageName;
    this.conflictsWith = options?.conflictsWith;
  }
}

/**
 * Error when a package requires a specific macOS version.
 */
export class UnsupportedMacOSError extends BrewError {
  readonly packageName?: string;
  readonly requiredVersion?: string;
  readonly currentVersion?: string;

  constructor(
    message: string,
    options?: { cause?: Error; packageName?: string; requiredVersion?: string; currentVersion?: string },
  ) {
    super(message, { cause: options?.cause });
    this.name = "UnsupportedMacOSError";
    this.packageName = options?.packageName;
    this.requiredVersion = options?.requiredVersion;
    this.currentVersion = options?.currentVersion;
  }
}

/// Type Guards

/**
 * Check if an error is a BrewError.
 */
export function isBrewError(error: unknown): error is BrewError {
  return error instanceof BrewError;
}

/**
 * Check if an error is a NetworkError.
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Check if an error is a BrewLockError.
 */
export function isBrewLockError(error: unknown): error is BrewLockError {
  return error instanceof BrewLockError;
}

/**
 * Check if an error is a DownloadTimeoutError.
 */
export function isDownloadTimeoutError(error: unknown): error is DownloadTimeoutError {
  return error instanceof DownloadTimeoutError;
}

/**
 * Check if an error is a StaleProcessError.
 */
export function isStaleProcessError(error: unknown): error is StaleProcessError {
  return error instanceof StaleProcessError;
}

/**
 * Check if an error is a PackageDisabledError.
 */
export function isPackageDisabledError(error: unknown): error is PackageDisabledError {
  return error instanceof PackageDisabledError;
}

/**
 * Check if an error is a PackageConflictError.
 */
export function isPackageConflictError(error: unknown): error is PackageConflictError {
  return error instanceof PackageConflictError;
}

/**
 * Check if an error is an UnsupportedMacOSError.
 */
export function isUnsupportedMacOSError(error: unknown): error is UnsupportedMacOSError {
  return error instanceof UnsupportedMacOSError;
}

/**
 * Check if an error is recoverable (can be retried).
 * Network errors, lock errors, timeout errors, and stale process errors are typically recoverable.
 * Disabled packages, conflicts, and macOS version errors are NOT recoverable.
 */
export function isRecoverableError(error: unknown): boolean {
  return isNetworkError(error) || isBrewLockError(error) || isDownloadTimeoutError(error) || isStaleProcessError(error);
}

/// Message Detection

/**
 * Patterns that indicate a brew lock/concurrent process error.
 */
const BREW_LOCK_PATTERNS = [
  /lockf:.*already locked/i,
  /another active Homebrew/i,
  /another brew process/i,
  /another.*brew.*update.*process/i,
  /Homebrew is already running/i,
  /Error: Another active Homebrew/i,
  /Error: Another.*brew.*process/i,
  /waiting for lock/i,
  /lock file/i,
  /has already locked/i, // Homebrew 5.0: "A `brew upgrade` process has already locked ..."
  /brew upgrade.*process has already/i,
];

/**
 * Pattern to detect disabled/discontinued packages.
 * Matches: "Error: Cask 'name' has been disabled because it is discontinued upstream! It was disabled on 2024-12-16."
 * Or: "Error: Formula 'name' has been disabled because ..."
 */
const DISABLED_PACKAGE_PATTERN =
  /Error: (Cask|Formula) '([^']+)' has been disabled(?: because (.+?))?(?:! It was disabled on (\d{4}-\d{2}-\d{2}))?/i;

/**
 * Pattern to detect package conflicts.
 * Matches: "Error: Cask 'name' conflicts with 'other'"
 */
const CONFLICT_PATTERN = /Error: (Cask|Formula) '([^']+)' conflicts with '([^']+)'/i;

/**
 * Pattern to detect macOS version requirements.
 * Matches: "Error: Cask 'name' requires macOS >= 12.0"
 */
const MACOS_VERSION_PATTERN = /Error: (Cask|Formula) '([^']+)' requires macOS\s*([><=]+\s*[\d.]+)/i;

/**
 * Check if an error message indicates a brew lock error.
 */
export function isBrewLockMessage(message: string): boolean {
  return BREW_LOCK_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Check if an error message indicates a disabled package.
 */
export function isDisabledPackageMessage(message: string): boolean {
  return DISABLED_PACKAGE_PATTERN.test(message);
}

/**
 * Parse disabled package details from an error message.
 */
export function parseDisabledPackageMessage(message: string): {
  packageType: "formula" | "cask";
  packageName: string;
  reason?: string;
  disabledDate?: string;
} | null {
  const match = message.match(DISABLED_PACKAGE_PATTERN);
  if (!match) return null;

  return {
    packageType: match[1].toLowerCase() as "formula" | "cask",
    packageName: match[2],
    reason: match[3]?.trim(),
    disabledDate: match[4],
  };
}

/**
 * Check if an error message indicates a package conflict.
 */
export function isConflictMessage(message: string): boolean {
  return CONFLICT_PATTERN.test(message);
}

/**
 * Check if an error message indicates a macOS version requirement.
 */
export function isMacOSVersionMessage(message: string): boolean {
  return MACOS_VERSION_PATTERN.test(message);
}

/**
 * Get a user-friendly error message from an error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof BrewLockError) {
    return "Another brew process is already running. Please wait for it to finish and try again.";
  }

  if (error instanceof DownloadTimeoutError) {
    const pkg = error.packageName ? ` for "${error.packageName}"` : "";
    const phase = error.phase ? ` during ${error.phase}` : "";
    return `Download timed out${pkg}${phase}. Please try again.`;
  }

  if (error instanceof StaleProcessError) {
    const pkg = error.packageName ? ` for "${error.packageName}"` : "";
    const phase = error.lastPhase ? ` (stuck at ${error.lastPhase})` : "";
    return `Process appears stuck${pkg}${phase}. The operation was cancelled.`;
  }

  if (error instanceof PackageDisabledError) {
    const type = error.packageType ?? "package";
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    let message = `${typeName} "${error.packageName}" has been discontinued`;
    if (error.reason) {
      message += `: ${error.reason}`;
    }
    if (error.disabledDate) {
      message += ` (disabled on ${error.disabledDate})`;
    }
    return message;
  }

  if (error instanceof PackageConflictError) {
    const conflicts = error.conflictsWith?.join(", ") ?? "another package";
    return `"${error.packageName}" conflicts with ${conflicts}. Please uninstall the conflicting package first.`;
  }

  if (error instanceof UnsupportedMacOSError) {
    let message = `"${error.packageName}" requires a different macOS version`;
    if (error.requiredVersion) {
      message += ` (requires ${error.requiredVersion})`;
    }
    return message;
  }

  if (error instanceof NetworkError) {
    if (error.statusCode) {
      return `Network error (HTTP ${error.statusCode}): ${error.message}`;
    }
    return `Network error: ${error.message}`;
  }

  if (error instanceof BrewNotFoundError) {
    return `Homebrew not found: ${error.message}`;
  }

  if (error instanceof PackageNotFoundError) {
    const type = error.packageType ?? "package";
    return `${type.charAt(0).toUpperCase() + type.slice(1)} not found: ${error.packageName ?? error.message}`;
  }

  if (error instanceof BrewCommandError) {
    // Check for null exit code (process was killed/cancelled)
    if (error.exitCode === undefined || error.exitCode === null) {
      return "Cancelled";
    }
    // Check if the stderr contains a known error pattern for better messages
    if (error.stderr) {
      // Check for disabled package
      const disabledInfo = parseDisabledPackageMessage(error.stderr);
      if (disabledInfo) {
        let message = `${disabledInfo.packageType.charAt(0).toUpperCase() + disabledInfo.packageType.slice(1)} "${disabledInfo.packageName}" has been discontinued`;
        if (disabledInfo.reason) {
          message += `: ${disabledInfo.reason}`;
        }
        if (disabledInfo.disabledDate) {
          message += ` (disabled on ${disabledInfo.disabledDate})`;
        }
        return message;
      }
    }
    return error.stderr ?? error.message;
  }

  if (error instanceof BrewError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Handle abort errors with user-friendly message
    if (error.name === "AbortError") {
      return "Cancelled";
    }

    // Check for ExecError-like objects
    const execError = error as { stderr?: string; stdout?: string };
    if (execError.stderr) {
      // Check for disabled package in raw stderr
      const disabledInfo = parseDisabledPackageMessage(execError.stderr);
      if (disabledInfo) {
        let message = `${disabledInfo.packageType.charAt(0).toUpperCase() + disabledInfo.packageType.slice(1)} "${disabledInfo.packageName}" has been discontinued`;
        if (disabledInfo.reason) {
          message += `: ${disabledInfo.reason}`;
        }
        if (disabledInfo.disabledDate) {
          message += ` (disabled on ${disabledInfo.disabledDate})`;
        }
        return message;
      }
      return execError.stderr;
    }
    return error.message;
  }

  return String(error);
}
