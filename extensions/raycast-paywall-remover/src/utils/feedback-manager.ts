import { showToast, Toast, open } from "@raycast/api";
import { ErrorResponse, UrlProcessingResult } from "../types";

/**
 * Feedback manager for handling loading states, success messages, and user feedback
 * Implements requirements 4.1, 4.2 for loading indicators and success feedback
 */
export class FeedbackManager {
  /**
   * Shows a loading toast with a message
   * Requirement 4.1: Display loading indicator when process starts
   */
  static async showLoading(message: string = "Processing..."): Promise<Toast> {
    return await showToast({
      style: Toast.Style.Animated,
      title: message,
    });
  }

  /**
   * Shows a success toast and opens the processed URL
   * Requirement 4.2: Show success message and open result when process completes
   */
  static async showSuccess(result: UrlProcessingResult, customMessage?: string): Promise<void> {
    const message = customMessage || "Paywall removed successfully!";

    await showToast({
      style: Toast.Style.Success,
      title: message,
      message: `Opening: ${this.truncateUrl(result.processedUrl)}`,
    });

    // Open the processed URL in the default browser
    await open(result.processedUrl);
  }

  /**
   * Shows an error toast with detailed error information
   * Requirement 4.3: Display clear error message when process fails
   */
  static async showError(error: ErrorResponse): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: error.message,
      message: error.suggestion,
    });
  }

  /**
   * Updates an existing toast to show success
   * Useful for updating loading toasts to success state
   */
  static async updateToastSuccess(toast: Toast, result: UrlProcessingResult, customMessage?: string): Promise<void> {
    const message = customMessage || "Paywall removed successfully!";

    toast.style = Toast.Style.Success;
    toast.title = message;
    toast.message = `Opening: ${this.truncateUrl(result.processedUrl)}`;

    // Open the processed URL in the default browser
    await open(result.processedUrl);
  }

  /**
   * Updates an existing toast to show error
   * Useful for updating loading toasts to error state
   */
  static async updateToastError(toast: Toast, error: ErrorResponse): Promise<void> {
    toast.style = Toast.Style.Failure;
    toast.title = error.message;
    toast.message = error.suggestion;
  }

  /**
   * Shows a progress toast for longer operations
   * Requirement 4.1: Create progress indicators for longer operations
   */
  static async showProgress(message: string, progress?: number): Promise<Toast> {
    const progressMessage = progress !== undefined ? `${message} (${Math.round(progress * 100)}%)` : message;

    return await showToast({
      style: Toast.Style.Animated,
      title: progressMessage,
    });
  }

  /**
   * Updates progress toast with new progress value
   */
  static updateProgress(toast: Toast, message: string, progress?: number): void {
    const progressMessage = progress !== undefined ? `${message} (${Math.round(progress * 100)}%)` : message;

    toast.title = progressMessage;
  }

  /**
   * Shows a warning toast for non-critical issues
   */
  static async showWarning(title: string, message?: string): Promise<void> {
    await showToast({
      style: Toast.Style.Failure, // Raycast doesn't have a warning style, use failure
      title: `⚠️ ${title}`,
      message,
    });
  }

  /**
   * Shows an info toast for general information
   */
  static async showInfo(title: string, message?: string): Promise<void> {
    await showToast({
      style: Toast.Style.Success,
      title: `ℹ️ ${title}`,
      message,
    });
  }

  /**
   * Shows feedback for clipboard URL processing
   * Requirement 4.1, 4.2: Specific feedback for clipboard workflow
   */
  static async showClipboardProcessing(): Promise<Toast> {
    return await this.showLoading("Reading clipboard and processing URL...");
  }

  /**
   * Shows feedback for current tab URL processing
   * Requirement 4.1, 4.2: Specific feedback for current tab workflow
   */
  static async showCurrentTabProcessing(): Promise<Toast> {
    return await this.showLoading("Getting current tab URL and processing...");
  }

  /**
   * Shows success feedback specifically for clipboard workflow
   */
  static async showClipboardSuccess(result: UrlProcessingResult): Promise<void> {
    await this.showSuccess(result, "Clipboard URL processed successfully!");
  }

  /**
   * Shows success feedback specifically for current tab workflow
   */
  static async showCurrentTabSuccess(result: UrlProcessingResult): Promise<void> {
    await this.showSuccess(result, "Current tab URL processed successfully!");
  }

  /**
   * Shows feedback when using default service
   */
  static async showDefaultServiceInfo(): Promise<void> {
    await this.showInfo("Using default service", "Configure a custom paywall service in preferences");
  }

  /**
   * Shows feedback when service configuration is updated
   */
  static async showServiceConfigured(serviceUrl: string): Promise<void> {
    await this.showInfo("Service configured", `Using: ${this.truncateUrl(serviceUrl)}`);
  }

  /**
   * Shows feedback for URL validation issues with suggestions
   */
  static async showUrlValidationError(url: string): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL format",
      message: `Check URL: ${this.truncateUrl(url)}`,
    });
  }

  /**
   * Shows feedback for network connectivity issues
   */
  static async showNetworkError(): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: "Network error",
      message: "Check your internet connection and try again",
    });
  }

  /**
   * Shows feedback for browser access issues
   */
  static async showBrowserAccessError(): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: "Browser access error",
      message: "Open a supported browser and try again",
    });
  }

  /**
   * Shows feedback for clipboard access issues
   */
  static async showClipboardAccessError(): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard access error",
      message: "Copy a URL to your clipboard and try again",
    });
  }

  /**
   * Truncates long URLs for display in toasts
   * Keeps URLs readable while preventing toast overflow
   */
  private static truncateUrl(url: string, maxLength: number = 50): string {
    if (url.length <= maxLength) {
      return url;
    }

    // Try to keep the domain and truncate the path
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname + urlObj.search;

      if (domain.length >= maxLength - 3) {
        return `${domain.substring(0, maxLength - 3)}...`;
      }

      const availablePathLength = maxLength - domain.length - 3; // 3 for "..."
      if (path.length > availablePathLength) {
        return `${domain}${path.substring(0, availablePathLength)}...`;
      }

      return url;
    } catch {
      // If URL parsing fails, just truncate the string
      return `${url.substring(0, maxLength - 3)}...`;
    }
  }

  /**
   * Creates a comprehensive feedback flow for URL processing
   * Handles the complete user feedback cycle from start to finish
   */
  static async processWithFeedback<T>(
    operation: () => Promise<T>,
    loadingMessage: string,
    successHandler?: (result: T) => Promise<void>,
    errorHandler?: (error: unknown) => Promise<void>
  ): Promise<T | null> {
    const toast = await this.showLoading(loadingMessage);

    try {
      const result = await operation();

      if (successHandler) {
        await successHandler(result);
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Operation completed successfully";
      }

      return result;
    } catch (error) {
      if (errorHandler) {
        await errorHandler(error);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Operation failed";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }

      return null;
    }
  }

  /**
   * Shows feedback for different stages of URL processing
   * Provides detailed progress information for complex operations
   */
  static async showProcessingStages(
    stages: Array<{ name: string; duration?: number }>,
    onStageComplete?: (stageName: string, index: number) => void
  ): Promise<void> {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const progress = (i + 1) / stages.length;

      const toast = await this.showProgress(`${stage.name}...`, progress);

      // Simulate stage duration if provided
      if (stage.duration) {
        await new Promise((resolve) => setTimeout(resolve, stage.duration));
      }

      if (onStageComplete) {
        onStageComplete(stage.name, i);
      }

      // Update toast to show completion
      if (i === stages.length - 1) {
        toast.style = Toast.Style.Success;
        toast.title = "Processing complete";
      }
    }
  }

  /**
   * Validates and shows appropriate feedback for different error types
   * Provides consistent error handling across the application
   */
  static async handleErrorWithFeedback(error: unknown): Promise<void> {
    if (error && typeof error === "object" && "type" in error && "message" in error) {
      // Handle structured ErrorResponse
      await this.showError(error as ErrorResponse);
    } else if (error instanceof Error) {
      // Handle standard Error objects
      await showToast({
        style: Toast.Style.Failure,
        title: "An error occurred",
        message: error.message,
      });
    } else {
      // Handle unknown error types
      await showToast({
        style: Toast.Style.Failure,
        title: "An unexpected error occurred",
        message: "Please try again",
      });
    }
  }
}
