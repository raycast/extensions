/**
 * Custom error types for Harmony Hub integration
 * @module
 */

/**
 * Categories of errors that can occur
 */
export enum ErrorCategory {
  /** Network or connection errors */
  CONNECTION = "CONNECTION",
  /** Network-specific errors */
  NETWORK = "NETWORK",
  /** WebSocket-specific errors */
  WEBSOCKET = "WEBSOCKET",
  /** Hub communication errors */
  HUB_COMMUNICATION = "HUB_COMMUNICATION",
  /** Command-related errors */
  COMMAND = "COMMAND",
  /** Command execution errors */
  COMMAND_EXECUTION = "COMMAND_EXECUTION",
  /** Activity start errors */
  ACTIVITY_START = "ACTIVITY_START",
  /** Activity stop errors */
  ACTIVITY_STOP = "ACTIVITY_STOP",
  /** Cache-related errors */
  CACHE = "CACHE",
  /** Storage-related errors */
  STORAGE = "STORAGE",
  /** State validation errors */
  STATE = "STATE",
  /** Data validation errors */
  DATA = "DATA",
  /** Validation errors */
  VALIDATION = "VALIDATION",
  /** Discovery errors */
  DISCOVERY = "DISCOVERY",
  /** Queue-related errors */
  QUEUE = "QUEUE",
  /** Harmony-specific errors */
  HARMONY = "HARMONY",
  /** Authentication errors */
  AUTHENTICATION = "AUTHENTICATION",
  /** System-level errors */
  SYSTEM = "SYSTEM",
  /** Unknown errors */
  UNKNOWN = "UNKNOWN",
}

/**
 * Severity levels for errors
 */
export enum ErrorSeverity {
  /** Warning level - operation can continue */
  WARNING = "WARNING",
  /** Error level - operation cannot continue */
  ERROR = "ERROR",
  /** Fatal level - application cannot continue */
  FATAL = "FATAL",
}

/**
 * Context for retryable operations
 */
export interface RetryContext {
  /** Number of attempts made */
  readonly attempts: number;
  /** Maximum number of attempts allowed */
  readonly maxAttempts: number;
  /** Time of first attempt */
  readonly firstAttempt: number;
  /** Timestamp of the last attempt */
  readonly lastAttemptTimestamp: number;
  /** Next scheduled retry time */
  readonly nextRetry: number | null;
  /** Whether maximum retries have been reached */
  readonly maxRetriesReached: boolean;
  /** Total retry duration in milliseconds */
  readonly totalDuration: number;
  /** Success rate of previous attempts */
  readonly successRate?: number;
  /** Delay between attempts in milliseconds */
  readonly delayMs: number;
}

/**
 * Strategy for recovering from errors
 */
export interface ErrorRecoveryStrategy {
  /** Name of the recovery strategy */
  readonly name: string;
  /** Description of what the strategy does */
  readonly description: string;
  /** Whether the strategy can be automated */
  readonly isAutomatic: boolean;
  /** Recovery actions to attempt */
  readonly actions: ErrorRecoveryAction[];
}

/**
 * Details that can be included with errors
 */
export interface ErrorDetails {
  /** Type of the invalid value */
  type?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** List of allowed values */
  allowedValues?: readonly string[];
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Recovery actions available for different error types
 */
export enum ErrorRecoveryAction {
  /** Retry the failed operation */
  RETRY = "RETRY",
  /** Reconnect to the hub */
  RECONNECT = "RECONNECT",
  /** Clear local cache */
  CLEAR_CACHE = "CLEAR_CACHE",
  /** Reset configuration */
  RESET_CONFIG = "RESET_CONFIG",
  /** Restart the hub */
  RESTART = "RESTART",
  /** Manual intervention required */
  MANUAL = "MANUAL",
}

/**
 * Custom error class for Harmony Hub operations
 * Provides detailed error information and categorization
 */
export class HarmonyError extends Error {
  /** The category of the error */
  readonly category: ErrorCategory;
  /** Error severity level */
  readonly severity: ErrorSeverity;
  /** The original error that caused this error, if any */
  readonly cause?: Error;
  /** Retry context if applicable */
  readonly retryContext?: RetryContext;
  /** Whether the error is retryable */
  readonly isRetryable: boolean;
  /** Error code if any */
  readonly code?: string;
  /** Additional error details */
  readonly details?: ErrorDetails;
  /** Recovery strategies */
  readonly recoveryStrategies?: ErrorRecoveryStrategy[];
  /** Timestamp when error occurred */
  readonly timestamp: number;

  /**
   * Creates a new HarmonyError instance
   * @param message - User-friendly error message
   * @param category - Category of the error
   * @param cause - Original error that caused this error
   * @param retryContext - Context for retryable operations
   * @param isRetryable - Whether the operation can be retried
   * @param code - Error code for specific error types
   * @param details - Additional error details
   * @param severity - Severity level of the error
   * @param recoveryStrategies - Strategies for recovering from the error
   */
  constructor(
    message: string,
    category: ErrorCategory,
    cause?: Error,
    retryContext?: RetryContext,
    isRetryable = true,
    code?: string,
    details?: ErrorDetails,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    recoveryStrategies?: ErrorRecoveryStrategy[],
  ) {
    super(message);
    this.name = "HarmonyError";
    this.category = category;
    this.severity = severity;
    this.cause = cause;
    this.retryContext = retryContext;
    this.isRetryable = isRetryable;
    this.code = code;
    this.details = details;
    this.recoveryStrategies = recoveryStrategies;
    this.timestamp = Date.now();

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HarmonyError);
    }
  }

  /**
   * Gets a user-friendly error message suitable for display
   * @returns User-friendly error message with severity prefix
   */
  getUserMessage(): string {
    const prefix = this.severity === ErrorSeverity.WARNING ? "Warning" : "Error";
    return `${prefix}: ${this.message}`;
  }

  /**
   * Gets a detailed error message including all error information
   * Useful for logging and debugging
   * @returns Detailed multi-line error message
   */
  getDetailedMessage(): string {
    const details: string[] = [
      `Error: ${this.message}`,
      `Category: ${this.category}`,
      `Severity: ${this.severity}`,
      `Timestamp: ${new Date(this.timestamp).toISOString()}`,
      `Retryable: ${this.isRetryable}`,
    ];

    if (this.code) {
      details.push(`Code: ${this.code}`);
    }

    if (this.retryContext) {
      details.push(
        `Retry Attempts: ${this.retryContext.attempts}/${this.retryContext.maxAttempts}`,
        `Last Attempt: ${new Date(this.retryContext.lastAttemptTimestamp).toISOString()}`,
      );
    }

    if (this.cause) {
      details.push(`Cause: ${this.cause.message}`);
      if (this.cause.stack) {
        details.push(`Stack: ${this.cause.stack}`);
      }
    }

    if (this.details) {
      details.push(`Additional Details: ${JSON.stringify(this.details, null, 2)}`);
    }

    return details.join("\n");
  }

  /**
   * Gets the default recovery strategy for this error
   * @returns The default recovery strategy for this error type
   */
  getDefaultRecoveryStrategy(): ErrorRecoveryStrategy {
    switch (this.category) {
      case ErrorCategory.CONNECTION:
      case ErrorCategory.NETWORK:
      case ErrorCategory.WEBSOCKET:
      case ErrorCategory.HUB_COMMUNICATION:
        return {
          name: "Connection Recovery",
          description: "Attempt to restore connection to the hub",
          isAutomatic: true,
          actions: [ErrorRecoveryAction.RECONNECT],
        };

      case ErrorCategory.COMMAND:
      case ErrorCategory.COMMAND_EXECUTION:
        return {
          name: "Command Recovery",
          description: "Attempt to re-execute the command",
          isAutomatic: true,
          actions: [ErrorRecoveryAction.RETRY],
        };

      case ErrorCategory.ACTIVITY_START:
      case ErrorCategory.ACTIVITY_STOP:
        return {
          name: "Activity Recovery",
          description: "Attempt to retry the activity operation",
          isAutomatic: true,
          actions: [ErrorRecoveryAction.RETRY],
        };

      case ErrorCategory.CACHE:
      case ErrorCategory.STORAGE:
        return {
          name: "Storage Recovery",
          description: "Clear and rebuild cache data",
          isAutomatic: true,
          actions: [ErrorRecoveryAction.CLEAR_CACHE],
        };

      case ErrorCategory.STATE:
        return {
          name: "State Recovery",
          description: "Reset application state",
          isAutomatic: false,
          actions: [ErrorRecoveryAction.RESET_CONFIG, ErrorRecoveryAction.CLEAR_CACHE, ErrorRecoveryAction.RECONNECT],
        };

      case ErrorCategory.DATA:
      case ErrorCategory.VALIDATION:
        return {
          name: "Data Recovery",
          description: "Refresh data from hub",
          isAutomatic: true,
          actions: [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CLEAR_CACHE],
        };

      case ErrorCategory.DISCOVERY:
        return {
          name: "Discovery Recovery",
          description: "Retry hub discovery",
          isAutomatic: true,
          actions: [ErrorRecoveryAction.RETRY],
        };

      default:
        return {
          name: "Manual Recovery",
          description: "Manual intervention required",
          isAutomatic: false,
          actions: [ErrorRecoveryAction.MANUAL],
        };
    }
  }
}
