/**
 * Error categories for Harmony Hub extension
 */
export enum ErrorCategory {
  /** Connection-related errors */
  CONNECTION = "connection",
  /** Hub discovery errors */
  DISCOVERY = "discovery",
  /** Command execution errors */
  COMMAND = "command",
  /** State management errors */
  STATE = "state",
  /** Data retrieval or parsing errors */
  DATA = "data",
  /** UI-related errors */
  UI = "ui",
  /** Network communication errors */
  NETWORK = "network",
  /** Storage operation errors */
  STORAGE = "storage",
  /** Harmony Hub specific errors */
  HARMONY = "harmony",
  /** Input validation errors */
  VALIDATION = "validation",
  /** WebSocket communication errors */
  WEBSOCKET = "websocket",
  /** Authentication errors */
  AUTHENTICATION = "authentication",
  /** System-level errors */
  SYSTEM = "system",
  /** Command queue errors */
  QUEUE = "queue",
  /** Command execution errors */
  COMMAND_EXECUTION = "command_execution",
  /** Hub communication errors */
  HUB_COMMUNICATION = "hub_communication",
  /** Configuration errors */
  CONFIG = "config",
  /** Resource cleanup errors */
  CLEANUP = "cleanup",
  /** Rate limiting errors */
  RATE_LIMIT = "rate_limit",
  /** Permission errors */
  PERMISSION = "permission",
  /** Cache-related errors */
  CACHE = "cache",
  /** Activity start errors */
  ACTIVITY_START = "activity_start",
  /** Activity stop errors */
  ACTIVITY_STOP = "activity_stop",
  /** Unknown or unclassified errors */
  UNKNOWN = "unknown"
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Informational messages that don't affect functionality */
  INFO = "info",
  /** Minor issues that don't affect core functionality */
  WARNING = "warning",
  /** Serious issues that affect core functionality */
  ERROR = "error",
  /** Critical issues that prevent the extension from working */
  CRITICAL = "critical"
}

/**
 * Error recovery action types
 */
export enum ErrorRecoveryAction {
  /** Retry the operation */
  RETRY = "retry",
  /** Reconnect to the hub */
  RECONNECT = "reconnect",
  /** Clear cache and retry */
  CLEAR_CACHE = "clear_cache",
  /** Reset configuration */
  RESET_CONFIG = "reset_config",
  /** Restart extension */
  RESTART = "restart",
  /** Manual user intervention required */
  MANUAL = "manual"
}

/**
 * Retry configuration for error handling
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
  /** Categories to never retry */
  nonRetryableCategories?: ErrorCategory[];
  /** Maximum total retry duration in milliseconds */
  maxRetryDuration?: number;
}

/**
 * Timeout configuration for operations
 */
export interface TimeoutConfig {
  /** Connection timeout in milliseconds */
  connection: number;
  /** Message timeout in milliseconds */
  message: number;
  /** Activity timeout in milliseconds */
  activity: number;
  /** Command timeout in milliseconds */
  command: number;
  /** Discovery timeout in milliseconds */
  discovery: number;
  /** Cache timeout in milliseconds */
  cache: number;
}

/**
 * Retry context for error handling
 */
export interface RetryContext {
  /** Number of retry attempts made */
  attempts: number;
  /** Time of first attempt */
  firstAttempt: number;
  /** Time of last attempt */
  lastAttempt: number;
  /** Next scheduled retry time */
  nextRetry: number | null;
  /** Whether maximum retries have been reached */
  maxRetriesReached: boolean;
  /** Total retry duration in milliseconds */
  totalDuration: number;
  /** Success rate of previous attempts */
  successRate?: number;
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  /** Actions to take for recovery */
  actions: ErrorRecoveryAction[];
  /** Order to try actions */
  priority: number;
  /** Whether to attempt recovery automatically */
  automatic: boolean;
  /** Maximum attempts for this strategy */
  maxAttempts: number;
  /** Delay between recovery attempts */
  delayBetweenAttempts: number;
}

/**
 * Custom error class for Harmony Hub extension
 */
export class HarmonyError extends Error {
  /** Error category */
  public readonly category: ErrorCategory;
  /** Error severity */
  public readonly severity: ErrorSeverity;
  /** Original error if any */
  public readonly originalError?: Error;
  /** Retry context if applicable */
  public readonly retryContext?: RetryContext;
  /** Whether the error is retryable */
  public readonly isRetryable: boolean;
  /** Error code if any */
  public readonly code?: string;
  /** Additional error details */
  public readonly details?: Record<string, unknown>;
  /** Recovery strategies */
  public readonly recoveryStrategies?: ErrorRecoveryStrategy[];
  /** Timestamp when error occurred */
  public readonly timestamp: number;

  constructor(
    message: string,
    category: ErrorCategory,
    originalError?: Error,
    retryContext?: RetryContext,
    isRetryable = true,
    code?: string,
    details?: Record<string, unknown>,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    recoveryStrategies?: ErrorRecoveryStrategy[]
  ) {
    super(message);
    this.name = "HarmonyError";
    this.category = category;
    this.severity = severity;
    this.originalError = originalError;
    this.retryContext = retryContext;
    this.isRetryable = isRetryable;
    this.code = code;
    this.details = details;
    this.recoveryStrategies = recoveryStrategies;
    this.timestamp = Date.now();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HarmonyError);
    }
  }

  /**
   * Create a new error with updated retry context
   */
  public withRetryContext(retryContext: RetryContext): HarmonyError {
    return new HarmonyError(
      this.message,
      this.category,
      this.originalError,
      retryContext,
      this.isRetryable,
      this.code,
      this.details,
      this.severity,
      this.recoveryStrategies
    );
  }

  /**
   * Create a new error with updated recovery strategies
   */
  public withRecoveryStrategies(strategies: ErrorRecoveryStrategy[]): HarmonyError {
    return new HarmonyError(
      this.message,
      this.category,
      this.originalError,
      this.retryContext,
      this.isRetryable,
      this.code,
      this.details,
      this.severity,
      strategies
    );
  }

  /**
   * Check if error should be retried based on category and context
   */
  public shouldRetry(config: RetryConfig): boolean {
    if (!this.isRetryable) return false;
    if (!this.retryContext) return true;
    if (this.retryContext.maxRetriesReached) return false;

    // Don't retry if we've exceeded max attempts
    if (this.retryContext.attempts >= config.maxAttempts) return false;

    // Don't retry if we've exceeded max duration
    if (config.maxRetryDuration && this.retryContext.totalDuration >= config.maxRetryDuration) {
      return false;
    }

    // Don't retry certain error categories
    const nonRetryableCategories = config.nonRetryableCategories || [
      ErrorCategory.VALIDATION,
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.PERMISSION
    ];
    if (nonRetryableCategories.includes(this.category)) return false;

    // Don't retry if success rate is too low
    if (this.retryContext.successRate !== undefined && this.retryContext.successRate < 0.2) {
      return false;
    }

    return true;
  }

  /**
   * Calculate next retry delay using exponential backoff
   */
  public getRetryDelay(config: RetryConfig): number {
    if (!this.retryContext) return config.baseDelay;

    const { attempts } = this.retryContext;
    const { baseDelay, maxDelay, useExponentialBackoff } = config;

    if (!useExponentialBackoff) return baseDelay;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      baseDelay * Math.pow(2, attempts),
      maxDelay
    );

    // Add jitter to prevent thundering herd
    return delay * (0.5 + Math.random());
  }

  /**
   * Get recommended recovery strategy
   */
  public getRecoveryStrategy(): ErrorRecoveryStrategy | null {
    if (!this.recoveryStrategies || this.recoveryStrategies.length === 0) {
      return this.getDefaultRecoveryStrategy();
    }

    // Get highest priority strategy that hasn't exceeded max attempts
    return this.recoveryStrategies
      .sort((a, b) => a.priority - b.priority)
      .find(s => !this.retryContext || this.retryContext.attempts < s.maxAttempts) || null;
  }

  /**
   * Get default recovery strategy based on error category
   */
  private getDefaultRecoveryStrategy(): ErrorRecoveryStrategy | null {
    switch (this.category) {
      case ErrorCategory.CONNECTION:
      case ErrorCategory.WEBSOCKET:
        return {
          actions: [ErrorRecoveryAction.RECONNECT],
          priority: 1,
          automatic: true,
          maxAttempts: 3,
          delayBetweenAttempts: 1000
        };
      case ErrorCategory.CACHE:
        return {
          actions: [ErrorRecoveryAction.CLEAR_CACHE, ErrorRecoveryAction.RETRY],
          priority: 1,
          automatic: true,
          maxAttempts: 2,
          delayBetweenAttempts: 500
        };
      case ErrorCategory.CONFIG:
        return {
          actions: [ErrorRecoveryAction.RESET_CONFIG],
          priority: 2,
          automatic: false,
          maxAttempts: 1,
          delayBetweenAttempts: 0
        };
      case ErrorCategory.ACTIVITY_START:
      case ErrorCategory.ACTIVITY_STOP:
        return {
          actions: [ErrorRecoveryAction.RETRY],
          priority: 1,
          automatic: true,
          maxAttempts: 2,
          delayBetweenAttempts: 500
        };
      default:
        return null;
    }
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(): string {
    const baseMessage = this.getBaseUserMessage();
    const recoveryMessage = this.recoveryMessage;
    return recoveryMessage ? `${baseMessage}\n\n${recoveryMessage}` : baseMessage;
  }

  /**
   * Get base user-friendly error message
   */
  private getBaseUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.CONNECTION:
        return "Failed to connect to Harmony Hub. Please check your network connection and try again.";
      case ErrorCategory.DISCOVERY:
        return "Failed to discover Harmony Hubs. Please ensure your hub is powered on and connected to the network.";
      case ErrorCategory.COMMAND:
      case ErrorCategory.COMMAND_EXECUTION:
        return "Failed to execute command. Please try again.";
      case ErrorCategory.STATE:
        return "Failed to update state. Please try reconnecting to the hub.";
      case ErrorCategory.DATA:
        return "Failed to retrieve data from Harmony Hub. Please try again.";
      case ErrorCategory.VALIDATION:
        return "Invalid input provided. Please check your input and try again.";
      case ErrorCategory.AUTHENTICATION:
        return "Authentication failed. Please check your credentials and try again.";
      case ErrorCategory.PERMISSION:
        return "You don't have permission to perform this action.";
      case ErrorCategory.RATE_LIMIT:
        return "Too many requests. Please wait a moment and try again.";
      case ErrorCategory.CONFIG:
        return "Configuration error. Please check your settings.";
      case ErrorCategory.CACHE:
        return "Cache error. Trying to refresh data.";
      case ErrorCategory.CLEANUP:
        return "Failed to clean up resources. You may need to restart the extension.";
      case ErrorCategory.ACTIVITY_START:
        return "Failed to start activity. Please try again.";
      case ErrorCategory.ACTIVITY_STOP:
        return "Failed to stop activity. Please try again.";
      default:
        return this.message;
    }
  }

  public get recoveryMessage(): string | null {
    return this.getRecoveryMessage();
  }

  public getRecoveryMessage(): string | null {
    const strategy = this.getRecoveryStrategy();
    if (!strategy) return null;

    if (!strategy.automatic) {
      switch (strategy.actions[0]) {
        case ErrorRecoveryAction.RESET_CONFIG:
          return "Try resetting your configuration in the extension settings.";
        case ErrorRecoveryAction.RESTART:
          return "Please restart the extension to resolve this issue.";
        case ErrorRecoveryAction.MANUAL:
          return "Manual intervention is required. Please check the documentation.";
        default:
          return null;
      }
    }
    return null;
  }
}
