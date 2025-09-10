import { showToast, Toast } from "@raycast/api";

export interface ErrorInfo {
  title: string;
  message: string;
  style?: Toast.Style;
}

export class ErrorHandler {
  static showError(error: unknown, context: string = "Operation"): void {
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    showToast({
      style: Toast.Style.Failure,
      title: `${context} Failed`,
      message,
    });
  }

  static showSuccess(title: string, message: string): void {
    showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  static showInfo(title: string, message: string): void {
    showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "An unknown error occurred";
  }

  static isConfigurationError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return (
      message.includes("configuration") ||
      message.includes("preferences") ||
      message.includes("api") ||
      message.includes("token") ||
      message.includes("url")
    );
  }
}

// Common error messages
export const ERROR_MESSAGES = {
  CONFIGURATION: "Please check your Canvas URL and API token in preferences",
  NETWORK: "Network error - please check your internet connection",
  API: "Canvas API error - please try again later",
  UNKNOWN: "An unexpected error occurred",
} as const;
