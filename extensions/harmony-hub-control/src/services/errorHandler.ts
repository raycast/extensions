import { showToast, Toast } from "@raycast/api";
import { Logger } from "../services/logger";
import { HarmonyError, ErrorCategory } from "../types/errors";

/**
 * ErrorHandler class for consistent error handling across the application.
 * Provides methods for handling errors, showing user feedback, and logging.
 */
export class ErrorHandler {
  /**
   * Handle any type of error, converting it to a HarmonyError if needed
   */
  static handle(error: Error | unknown, context?: string): void {
    const harmonyError = ErrorHandler.toHarmonyError(error);
    
    // Log the error
    Logger.logError(harmonyError, context);

    // Show user feedback
    ErrorHandler.showErrorToast(harmonyError);
  }

  /**
   * Handle a specific error with a category
   */
  static handleWithCategory(error: Error | unknown, category: ErrorCategory, context?: string): void {
    const harmonyError = ErrorHandler.toHarmonyError(error, category);
    
    // Log the error
    Logger.logError(harmonyError, context);

    // Show user feedback
    ErrorHandler.showErrorToast(harmonyError);
  }

  /**
   * Convert any error to a HarmonyError
   */
  private static toHarmonyError(error: Error | unknown, category?: ErrorCategory): HarmonyError {
    if (error instanceof HarmonyError) {
      return error;
    }

    const defaultCategory = category || ErrorCategory.UNKNOWN;
    const message = error instanceof Error ? error.message : String(error);
    const originalError = error instanceof Error ? error : undefined;

    return new HarmonyError(message, defaultCategory, originalError);
  }

  /**
   * Show an error toast to the user
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
   * Get a user-friendly title for an error category
   */
  private static getCategoryTitle(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return "Network Error";
      case ErrorCategory.STORAGE:
        return "Storage Error";
      case ErrorCategory.HARMONY:
        return "Harmony Hub Error";
      case ErrorCategory.VALIDATION:
        return "Validation Error";
      case ErrorCategory.WEBSOCKET:
        return "Connection Error";
      case ErrorCategory.COMMAND:
        return "Command Error";
      case ErrorCategory.AUTHENTICATION:
        return "Authentication Error";
      case ErrorCategory.SYSTEM:
        return "System Error";
      default:
        return "Error";
    }
  }

  /**
   * Handle an async operation with proper error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
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
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.handleWithCategory(error, category, context);
      throw error;
    }
  }
}
