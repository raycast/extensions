/**
 * Precise error pattern matching based on ipatool source code
 * This provides much more reliable error detection than generic pattern matching
 *
 * Enhanced with comprehensive error categorization and actionable guidance:
 * - timeout: Network timeouts with retry suggestions
 * - stalled: Downloads that stop progressing with retry suggestions
 * - disk_space: Insufficient storage with disk management actions
 * - permission_denied: File system permission errors with location change suggestions
 * - corruption: File corruption during download with retry suggestions
 *
 * Each error type includes suggestedAction for toast primaryAction buttons:
 * - "Retry": For temporary failures that can be retried
 * - "Open Disk Usage": Opens system storage settings for disk space issues
 * - "Change Location": Guides user to try different download location
 * - "Open Preferences": Opens extension preferences for configuration issues
 */

import { sanitizeQuery } from "./error-handler";

export interface IpatoolErrorInfo {
  isAuthError: boolean;
  is2FARequired: boolean;
  isCredentialError: boolean;
  isLicenseRequired: boolean;
  userMessage: string;
  suggestedAction?: string;
  errorType:
    | "2fa"
    | "credentials"
    | "network"
    | "permission"
    | "app_not_found"
    | "license_required"
    | "timeout"
    | "stalled"
    | "disk_space"
    | "permission_denied"
    | "corruption"
    | "generic";
}

/**
 * Analyzes error messages from ipatool based on actual source code patterns
 * @param errorMessage The main error message
 * @param stderr Optional stderr content
 * @param context Optional context about what operation was being performed
 */
export function analyzeIpatoolError(
  errorMessage: string,
  stderr?: string,
  context?: "auth" | "download" | "search",
): IpatoolErrorInfo {
  const fullMessage = `${errorMessage.trim()} ${(stderr || "").trim()}`.trim().toLowerCase();

  // 2FA Required - exact message from ipatool source
  if (
    fullMessage.includes("2fa code is required") ||
    fullMessage.includes("run the command again and supply a code using the") ||
    fullMessage.includes("auth-code") ||
    fullMessage.includes("enter 2fa code")
  ) {
    return {
      isAuthError: true,
      is2FARequired: true,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "Two-factor authentication required. Please provide the 6-digit code from your trusted device.",
      errorType: "2fa",
    };
  }

  // Password Required - from ipatool source
  if (
    fullMessage.includes("password is required when not running in interactive mode") ||
    fullMessage.includes('use the "password" flag')
  ) {
    return {
      isAuthError: true,
      is2FARequired: false,
      isCredentialError: true,
      isLicenseRequired: false,
      userMessage: "Password is required. Please check your Apple ID password in preferences.",
      errorType: "credentials",
    };
  }

  // Authentication/Login failures - from appstore package errors
  if (
    fullMessage.includes("failed to read password") ||
    fullMessage.includes("failed to read auth code") ||
    fullMessage.includes("login failed") ||
    fullMessage.includes("authentication failed") ||
    fullMessage.includes("invalid credentials") ||
    fullMessage.includes("unauthorized") ||
    fullMessage.includes("sign in failed")
  ) {
    return {
      isAuthError: true,
      is2FARequired: false,
      isCredentialError: true,
      isLicenseRequired: false,
      userMessage: "Invalid Apple ID credentials. Please check your email and password in preferences.",
      errorType: "credentials",
    };
  }

  // License required - specific case for apps that need a license (often free apps)
  if (fullMessage.includes("license is required")) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: true,
      userMessage: "App requires a license. Attempting to obtain license...",
      errorType: "license_required",
    };
  }

  // App Store errors - not available, requires purchase, etc.
  if (fullMessage.includes("not available for download") || fullMessage.includes("requires a purchase")) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "App requires purchase or is not available in your region.",
      errorType: "app_not_found",
    };
  }

  // Timeout errors - specific handling
  if (
    fullMessage.includes("download timed out") ||
    fullMessage.includes("timed out after") ||
    fullMessage.includes("timeout") ||
    fullMessage.includes("connection timeout")
  ) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "Download timed out. This may be due to slow network or server issues.",
      suggestedAction: "Retry",
      errorType: "timeout",
    };
  }

  // Stalled errors - downloads that stop progressing
  if (
    fullMessage.includes("download stalled") ||
    fullMessage.includes("stalled after") ||
    fullMessage.includes("no progress") ||
    fullMessage.includes("download stuck")
  ) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "Download stalled. No progress was made for an extended period.",
      suggestedAction: "Retry",
      errorType: "stalled",
    };
  }

  // Disk space errors
  if (
    fullMessage.includes("no space left") ||
    fullMessage.includes("disk full") ||
    fullMessage.includes("insufficient disk space") ||
    fullMessage.includes("not enough space") ||
    fullMessage.includes("disk space") ||
    fullMessage.includes("storage full")
  ) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "Insufficient disk space. Free up at least 500 MB and try again.",
      suggestedAction: "Open Disk Usage",
      errorType: "disk_space",
    };
  }

  // Permission denied errors
  if (
    fullMessage.includes("permission denied") ||
    fullMessage.includes("access denied") ||
    fullMessage.includes("operation not permitted") ||
    fullMessage.includes("failed to write") ||
    fullMessage.includes("cannot create") ||
    fullMessage.includes("forbidden")
  ) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "Permission denied. Check file system permissions or try a different download location.",
      suggestedAction: "Change Location",
      errorType: "permission_denied",
    };
  }

  // File corruption errors
  if (
    fullMessage.includes("corrupted") ||
    fullMessage.includes("corrupt") ||
    fullMessage.includes("checksum") ||
    fullMessage.includes("invalid file") ||
    fullMessage.includes("damaged") ||
    fullMessage.includes("verification failed") ||
    fullMessage.includes("hash mismatch")
  ) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "Download corrupted. The file was damaged during download.",
      suggestedAction: "Retry",
      errorType: "corruption",
    };
  }

  // Network errors
  if (
    fullMessage.includes("network") ||
    fullMessage.includes("connection") ||
    fullMessage.includes("tls") ||
    fullMessage.includes("timeout")
  ) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "Network error occurred. Please check your internet connection.",
      errorType: "network",
    };
  }

  // App not found
  if (
    fullMessage.includes("app not found") ||
    fullMessage.includes("no app") ||
    fullMessage.includes("does not exist")
  ) {
    return {
      isAuthError: false,
      is2FARequired: false,
      isCredentialError: false,
      isLicenseRequired: false,
      userMessage: "App not found. It may not be available in your region or may have been removed.",
      errorType: "app_not_found",
    };
  }

  // Special case: Empty stderr with process exit code 1 during authentication
  // This is very likely an authentication failure (bad credentials)
  if (
    context === "auth" &&
    (fullMessage.includes("process exited with code 1") || fullMessage.includes("exit code 1")) &&
    !stderr?.trim()
  ) {
    return {
      isAuthError: true,
      is2FARequired: false,
      isCredentialError: true,
      isLicenseRequired: false,
      userMessage: "Authentication failed. Please check your Apple ID credentials in preferences.",
      errorType: "credentials",
    };
  }

  // Generic fallback - but now we know it's likely not an auth error
  // if none of the specific patterns matched
  return {
    isAuthError: false,
    is2FARequired: false,
    isCredentialError: false,
    isLicenseRequired: false,
    userMessage: errorMessage.trim()
      ? `Download failed: ${sanitizeQuery(errorMessage.trim())}`
      : "Download failed. Please try again or check your connection.",
    errorType: "generic",
  };
}

/**
 * Quick check if an error is authentication-related
 */
export function isAuthenticationError(errorMessage: string, stderr?: string): boolean {
  const analysis = analyzeIpatoolError(errorMessage, stderr);
  return analysis.isAuthError;
}

/**
 * Quick check if an error requires 2FA
 */
export function requires2FA(errorMessage: string, stderr?: string): boolean {
  const analysis = analyzeIpatoolError(errorMessage, stderr);
  return analysis.is2FARequired;
}
