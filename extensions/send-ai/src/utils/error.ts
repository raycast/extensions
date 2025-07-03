import { Toast } from "@raycast/api";

/**
 * Extracts a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown, defaultMsg: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  // Handle axios error objects
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return defaultMsg;
}

/**
 * Creates a standardized error toast configuration
 */
export function createErrorToast(title: string, error: unknown, defaultMessage = "An unexpected error occurred") {
  return {
    style: Toast.Style.Failure,
    title,
    message: getErrorMessage(error, defaultMessage),
  };
}

/**
 * Creates a standardized success toast configuration
 */
export function createSuccessToast(title: string, message: string) {
  return {
    style: Toast.Style.Success,
    title,
    message,
  };
}
