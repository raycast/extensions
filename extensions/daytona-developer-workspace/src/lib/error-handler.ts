/**
 * Unified Error Handling System
 * Task 16.3: Centralized error handling for all Daytona commands
 */

import { showToast, Toast } from "@raycast/api";

export interface DaytonaError {
  type: "AuthenticationError" | "NetworkError" | "SandboxError" | "ValidationError" | "BillingError" | "UnknownError";
  message: string;
  details?: string;
  originalError?: Error;
}

/**
 * Maps various error types to user-friendly messages
 */
export function mapErrorToUserFriendly(error: unknown): DaytonaError {
  const errorMessage = (error as Error)?.message || String(error);

  // Authentication errors
  if (
    errorMessage.includes("API key") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("invalid credentials")
  ) {
    return {
      type: "AuthenticationError",
      message: "Authentication failed. Please check your Daytona API key in Raycast preferences.",
      details: errorMessage,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Network/connectivity errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout")
  ) {
    return {
      type: "NetworkError",
      message: "Network error. Please check your internet connection and try again.",
      details: errorMessage,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Sandbox-specific errors
  if (errorMessage.includes("sandbox") || errorMessage.includes("container") || errorMessage.includes("execution")) {
    return {
      type: "SandboxError",
      message: "Sandbox operation failed. Please try again.",
      details: errorMessage,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Validation errors
  if (errorMessage.includes("required") || errorMessage.includes("invalid") || errorMessage.includes("validation")) {
    return {
      type: "ValidationError",
      message: "Invalid input provided. Please check your data and try again.",
      details: errorMessage,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Billing / subscription issues
  if (errorMessage.includes("payment") || errorMessage.includes("suspended")) {
    return {
      type: "BillingError",
      message:
        "Your organization is suspended due to billing issues. Please add a valid payment method in Daytona dashboard.",
      details: errorMessage,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Fallback for unknown errors
  return {
    type: "UnknownError",
    message: "An unexpected error occurred. Please try again.",
    details: errorMessage,
    originalError: error instanceof Error ? error : undefined,
  };
}

/**
 * Display error toast to user with appropriate styling
 */
async function showErrorToast(daytonaError: DaytonaError): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Daytona Error",
    message: daytonaError.message,
    primaryAction: daytonaError.details
      ? {
          title: "View Details",
          onAction: () => {
            showToast({
              style: Toast.Style.Failure,
              title: "Error Details",
              message: daytonaError.details || "No additional details available",
            });
          },
        }
      : undefined,
  });
}

/**
 * Higher-order function that wraps command functions with error handling
 */
export function withDaytonaErrorHandling<T extends unknown[], R>(commandName: string, fn: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      console.log(`🚀 Executing ${commandName} command`);
      const result = await fn(...args);
      console.log(`✅ ${commandName} command completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ ${commandName} command failed:`, error);

      const daytonaError = mapErrorToUserFriendly(error);
      await showErrorToast(daytonaError);

      // Return undefined to indicate failure
      return undefined;
    }
  };
}

/**
 * Utility for manual error handling in command components
 */
export async function handleDaytonaError(error: unknown, context?: string): Promise<void> {
  console.error(`❌ Daytona error${context ? ` in ${context}` : ""}:`, error);

  const daytonaError = mapErrorToUserFriendly(error);
  await showErrorToast(daytonaError);
}

/**
 * Type guard to check if an object is a DaytonaError
 */
export function isDaytonaError(obj: unknown): obj is DaytonaError {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "type" in obj &&
    "message" in obj &&
    typeof (obj as DaytonaError).type === "string" &&
    typeof (obj as DaytonaError).message === "string"
  );
}
