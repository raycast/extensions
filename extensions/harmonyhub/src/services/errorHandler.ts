/**
 * Error handling service for Harmony Hub integration.
 * Provides centralized error handling, logging, and user feedback.
 * @module
 */

import { showToast, Toast } from "@raycast/api";

import { HarmonyError, ErrorCategory, ErrorSeverity, ErrorRecoveryAction } from "../types/core/errors";

import { logError } from "./logger";

/**
 * Configuration for error handling
 * @interface ErrorHandlerConfig
 */
interface ErrorHandlerConfig {
  /** Whether to show toasts for errors */
  showToasts: boolean;
  /** Whether to log errors */
  logErrors: boolean;
  /** Default error category if none is specified */
  defaultCategory: ErrorCategory;
  /** Default error severity if none is specified */
  defaultSeverity: ErrorSeverity;
}

/**
 * Default configuration for error handling
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showToasts: true,
  logErrors: true,
  defaultCategory: ErrorCategory.UNKNOWN,
  defaultSeverity: ErrorSeverity.ERROR,
};

/**
 * Service for handling errors in the Harmony extension.
 * Provides centralized error handling with logging and user feedback.
 */
export class ErrorHandler {
  /** Current error handler configuration */
  private static config: ErrorHandlerConfig = DEFAULT_CONFIG;

  /**
   * Configure the error handler
   * @param config - Partial configuration to merge with defaults
   */
  static configure(config: Partial<ErrorHandlerConfig>): void {
    ErrorHandler.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle any type of error, converting it to a HarmonyError if needed.
   * Logs the error and shows user feedback based on configuration.
   * @param error - The error to handle
   * @param context - Optional context information
   */
  static handle(error: Error | unknown, context?: string): void {
    const harmonyError = ErrorHandler.toHarmonyError(error);

    // Log the error if enabled
    if (ErrorHandler.config.logErrors) {
      logError(harmonyError, context);
    }

    // Show user feedback if enabled
    if (ErrorHandler.config.showToasts) {
      ErrorHandler.showErrorToast(harmonyError);
    }
  }

  /**
   * Handle a specific error with a category.
   * Logs the error and shows user feedback based on configuration.
   * @param error - The error to handle
   * @param category - The error category
   * @param context - Optional context information
   */
  static handleWithCategory(error: Error | unknown, category: ErrorCategory, context?: string): void {
    const harmonyError = ErrorHandler.toHarmonyError(error, category);

    // Log the error if enabled
    if (ErrorHandler.config.logErrors) {
      logError(harmonyError, context);
    }

    // Show user feedback if enabled
    if (ErrorHandler.config.showToasts) {
      ErrorHandler.showErrorToast(harmonyError);
    }
  }

  /**
   * Convert any error to a HarmonyError.
   * Ensures consistent error handling throughout the application.
   * @param error - The error to convert
   * @param category - Optional error category
   * @returns A HarmonyError instance
   * @private
   */
  private static toHarmonyError(error: Error | unknown, category?: ErrorCategory): HarmonyError {
    if (error instanceof HarmonyError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new HarmonyError(
      message,
      category || ErrorHandler.config.defaultCategory,
      error instanceof Error ? error : undefined,
    );
  }

  /**
   * Show an error toast to the user.
   * Displays user-friendly error information.
   * @param error - The error to display
   * @private
   */
  private static showErrorToast(error: HarmonyError): void {
    const title = ErrorHandler.getCategoryTitle(error.category);
    showToast({
      style: Toast.Style.Failure,
      title,
      message: error.message,
    });
  }

  /**
   * Get a user-friendly title for an error category.
   * @param category - The error category
   * @returns A user-friendly title
   * @private
   */
  private static getCategoryTitle(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.CONNECTION:
        return "Connection Error";
      case ErrorCategory.HUB_COMMUNICATION:
        return "Hub Communication Error";
      case ErrorCategory.COMMAND_EXECUTION:
        return "Command Execution Error";
      case ErrorCategory.STATE:
        return "State Error";
      case ErrorCategory.VALIDATION:
        return "Validation Error";
      case ErrorCategory.STORAGE:
        return "Storage Error";
      case ErrorCategory.CACHE:
        return "Cache Error";
      default:
        return "Error";
    }
  }

  /**
   * Handle an async operation with proper error handling
   */
  static async handleAsync<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.handle(error, context);
      throw error;
    }
  }

  /**
   * Handle an async operation with a specific error category
   */
  static async handleAsyncWithCategory<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    context?: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.handleWithCategory(error, category, context);
      throw error;
    }
  }

  /**
   * Get recovery actions for an error.
   * Determines appropriate recovery actions based on error category.
   * @param error - The error to get recovery actions for
   * @returns Array of recovery actions
   * @private
   */
  private static getRecoveryActions(error: HarmonyError): ErrorRecoveryAction[] {
    switch (error.category) {
      case ErrorCategory.CONNECTION:
      case ErrorCategory.HUB_COMMUNICATION:
        return [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.RECONNECT];
      case ErrorCategory.COMMAND_EXECUTION:
        return [ErrorRecoveryAction.RETRY];
      case ErrorCategory.STATE:
        return [ErrorRecoveryAction.RESET_CONFIG];
      case ErrorCategory.CACHE:
        return [ErrorRecoveryAction.CLEAR_CACHE];
      default:
        return [ErrorRecoveryAction.RETRY];
    }
  }

  /**
   * Show a success toast
   */
  static showSuccess(title: string, message?: string): void {
    if (!ErrorHandler.config.showToasts) return;

    showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  /**
   * Show a warning toast
   */
  static showWarning(title: string, message?: string): void {
    if (!ErrorHandler.config.showToasts) return;

    showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  /**
   * Show a loading toast
   */
  static showLoading(title: string, message?: string): void {
    if (!ErrorHandler.config.showToasts) return;

    showToast({
      style: Toast.Style.Animated,
      title,
      message,
    });
  }
}
