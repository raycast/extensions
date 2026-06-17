/**
 * Error Handling Utilities
 *
 * Centralized error management, logging, and user-friendly error display
 * for the Agent Client Protocol Raycast extension.
 */

import { showToast, Toast } from "@raycast/api";
import type { ExtensionError } from "@/types/extension";
import { ErrorCode } from "@/types/extension";
export { ErrorCode } from "@/types/extension";

/**
 * Custom error class for ACP extension
 */
export class ACPError extends Error {
  public readonly code: ErrorCode;
  public readonly details: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details = "", context?: Record<string, unknown>) {
    super(message);
    this.name = "ACPError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.context = context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ACPError);
    }
  }

  /**
   * Convert to ExtensionError interface
   */
  toExtensionError(): ExtensionError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      context: this.context,
    };
  }

  /**
   * Create ACPError from unknown error
   */
  static fromUnknown(error: unknown, code = ErrorCode.UnknownError): ACPError {
    if (error instanceof ACPError) {
      return error;
    }

    if (error instanceof Error) {
      return new ACPError(code, error.message, error.stack || "", { originalError: error.name });
    }

    return new ACPError(code, typeof error === "string" ? error : "An unknown error occurred", "", {
      originalValue: error,
    });
  }
}

/**
 * Error handling and display utilities
 */
export class ErrorHandler {
  private static errors: ExtensionError[] = [];
  private static maxErrors = 100;

  /**
   * Handle and display error to user
   */
  static async handleError(error: unknown, context?: string): Promise<void> {
    const acpError = ACPError.fromUnknown(error);
    const extensionError = acpError.toExtensionError();

    // Log error
    this.logError(extensionError, context);

    // Show user-friendly toast
    await this.showErrorToast(extensionError);

    // Store for debugging
    this.storeError(extensionError);
  }

  /**
   * Show user-friendly error toast
   */
  static async showErrorToast(error: ExtensionError): Promise<void> {
    const userMessage = this.getUserFriendlyMessage(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: userMessage,
    });
  }

  /**
   * Show success toast
   */
  static async showSuccess(message: string): Promise<void> {
    await showToast({
      style: Toast.Style.Success,
      title: "Success",
      message,
    });
  }

  /**
   * Show warning toast
   */
  static async showWarning(message: string): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: "Warning",
      message,
    });
  }

  /**
   * Show info toast
   */
  static async showInfo(message: string): Promise<void> {
    await showToast({
      style: Toast.Style.Success,
      title: "Info",
      message,
    });
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ExtensionError): string {
    switch (error.code) {
      case ErrorCode.AgentConnectionFailed:
        return "Unable to connect to the AI agent. Please check your configuration.";

      case ErrorCode.AgentUnavailable:
        return "The AI agent is currently unavailable. Please try again later.";

      case ErrorCode.ProtocolError:
        return "Communication error with the AI agent. Please try again.";

      case ErrorCode.SessionNotFound:
        return "Conversation session not found. It may have been deleted.";

      case ErrorCode.InvalidSession:
        return "Invalid conversation session. Please start a new conversation.";

      case ErrorCode.SessionExpired:
        return "Conversation session has expired. Please start a new conversation.";

      case ErrorCode.FileNotFound:
        return "File not found. Please check the file path and try again.";

      case ErrorCode.FileAccessDenied:
        return "File access denied. Please check permissions and try again.";

      case ErrorCode.InvalidFilePath:
        return "Invalid file path. Please provide a valid file path.";

      case ErrorCode.InvalidConfiguration:
        return "Invalid configuration. Please check your settings.";

      case ErrorCode.MissingConfiguration:
        return "Missing configuration. Please configure the extension first.";

      case ErrorCode.NetworkError:
        return "Network error. Please check your internet connection.";

      case ErrorCode.SystemError:
        return "System error occurred. Please try again or restart the extension.";

      case ErrorCode.UnknownError:
      default:
        return error.message || "An unexpected error occurred. Please try again.";
    }
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: ExtensionError): boolean {
    const recoverableErrors = [ErrorCode.NetworkError, ErrorCode.AgentUnavailable, ErrorCode.SessionExpired];

    return recoverableErrors.includes(error.code as ErrorCode);
  }

  /**
   * Get error recovery suggestions
   */
  static getRecoverySuggestions(error: ExtensionError): string[] {
    switch (error.code) {
      case ErrorCode.AgentConnectionFailed:
        return [
          "Check your agent configuration",
          "Verify the agent is installed and accessible",
          "Try a different agent",
        ];

      case ErrorCode.AgentUnavailable:
        return ["Wait a moment and try again", "Check if the agent process is running", "Restart the agent"];

      case ErrorCode.NetworkError:
        return ["Check your internet connection", "Try again in a few moments", "Check firewall settings"];

      case ErrorCode.FileAccessDenied:
        return ["Check file permissions", "Enable file access in settings", "Try a different file"];

      case ErrorCode.InvalidConfiguration:
        return ["Review your agent configuration", "Reset to default settings", "Check the configuration guide"];

      default:
        return ["Try again", "Restart the extension", "Check the extension logs"];
    }
  }

  /**
   * Log error for debugging
   */
  private static logError(error: ExtensionError, context?: string): void {
    const logMessage = `[ACP Error] ${error.code}: ${error.message}`;
    const logDetails = {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      context: context || error.context,
    };

    console.error(logMessage, logDetails);

    // In development, show more details
    if (process.env.NODE_ENV === "development") {
      console.error("Error stack:", error.details);
      console.error("Error context:", error.context);
    }
  }

  /**
   * Store error for debugging and analytics
   */
  private static storeError(error: ExtensionError): void {
    this.errors.unshift(error);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
  }

  /**
   * Get recent errors for debugging
   */
  static getRecentErrors(count = 10): ExtensionError[] {
    return this.errors.slice(0, count);
  }

  /**
   * Clear error history
   */
  static clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recent: number;
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errors.filter((e) => e.timestamp > oneHourAgo);

    const byCode: Record<string, number> = {};
    for (const error of this.errors) {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    }

    return {
      total: this.errors.length,
      byCode,
      recent: recentErrors.length,
    };
  }
}

/**
 * Utility functions for error handling
 */

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(fn: (...args: T) => Promise<R>, context?: string) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      await ErrorHandler.handleError(error, context);
      return undefined;
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Validate and throw error if condition fails
 */
export function assert(condition: boolean, code: ErrorCode, message: string): asserts condition {
  if (!condition) {
    throw new ACPError(code, message);
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
