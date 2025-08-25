// src/utils/errorHandling.ts
// Secure error handling utilities for security remediation

export interface SecureError {
  message: string;
  userMessage: string;
  canRetry: boolean;
  errorCode?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Creates a secure error with sanitized user message
 * Prevents internal application state from leaking to users
 */
export function createSecureError(
  internalMessage: string,
  userFriendlyMessage: string,
  canRetry: boolean = false,
  errorCode?: string,
): SecureError {
  return {
    message: internalMessage,
    userMessage: userFriendlyMessage,
    canRetry,
    errorCode,
  };
}

/**
 * Sanitizes error messages to prevent information leakage
 * Maps internal errors to user-safe messages
 */
export function sanitizeErrorMessage(error: unknown): string {
  const errorString = error instanceof Error ? error.message : String(error);

  // Map specific internal errors to user-safe messages
  const errorMappings: { [key: string]: string } = {
    // Crypto/Authentication errors
    "Failed to decrypt": "Authentication failed. Please check your password.",
    "Invalid token": "Session expired. Please log in again.",
    "Cannot read properties of undefined": "Authentication error. Please try logging in again.",
    kekSalt: "Passkey not supported, kindly disable and login and enable it back",

    // Network errors
    "Network error": "Unable to connect to server. Please check your internet connection.",
    ENOTFOUND: "Unable to connect to server. Please check your internet connection.",
    ECONNREFUSED: "Server is unavailable. Please try again later.",
    "fetch failed": "Network request failed. Please check your connection.",

    // Storage errors
    LocalStorage: "Unable to save data locally. Please try again.",
    encryption: "Unable to securely store data. Please try again.",

    // TOTP errors
    "Invalid base32": "Invalid authenticator code format. Please check the QR code.",
    base32: "Invalid authenticator format. Please re-add this authenticator.",

    // Generic fallbacks
    undefined: "An unexpected error occurred. Please try again.",
    null: "An unexpected error occurred. Please try again.",
  };

  // Check for specific error patterns and return sanitized messages
  for (const [pattern, sanitizedMessage] of Object.entries(errorMappings)) {
    if (errorString.toLowerCase().includes(pattern.toLowerCase())) {
      return sanitizedMessage;
    }
  }

  // Default sanitized message if no pattern matches
  return "An unexpected error occurred. Please try again.";
}

/**
 * Determines if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  const errorString = error instanceof Error ? error.message : String(error);
  const networkErrorPatterns = [
    "Network error",
    "ENOTFOUND",
    "ECONNREFUSED",
    "fetch failed",
    "ERR_NETWORK",
    "ERR_INTERNET_DISCONNECTED",
  ];

  return networkErrorPatterns.some((pattern) => errorString.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * Determines if an error is retryable or should show retry option
 */
export function isRetryableError(error: unknown): boolean {
  const errorString = error instanceof Error ? error.message : String(error);

  // Network errors are generally retryable
  if (isNetworkError(error)) {
    return true;
  }

  // Authentication errors are not retryable (need re-login)
  const nonRetryablePatterns = ["Invalid token", "Session expired", "Authentication failed", "Passkey not supported"];

  return !nonRetryablePatterns.some((pattern) => errorString.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * Logs errors securely without exposing sensitive data
 */
export function logSecureError(error: unknown, context: string): void {
  // Only log non-sensitive error information
  console.error(`[${context}] Error occurred:`, {
    type: error instanceof Error ? error.constructor.name : typeof error,
    hasMessage: error instanceof Error && Boolean(error.message),
    timestamp: new Date().toISOString(),
  });

  // Never log the actual error message or stack trace in production
  // as they may contain sensitive data
}

/**
 * Creates a validation result for secure input validation
 */
export function createValidationResult(isValid: boolean, error?: string): ValidationResult {
  return {
    isValid,
    error: error ? sanitizeErrorMessage(error) : undefined,
  };
}
