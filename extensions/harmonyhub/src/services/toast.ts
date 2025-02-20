/**
 * Toast notification service for Harmony Hub integration.
 * Provides consistent user feedback through Raycast toasts.
 * @module
 */

import { showToast, Toast } from "@raycast/api";

import { error, info } from "./logger";

/**
 * Configuration for toast notifications
 * @interface ToastConfig
 */
interface ToastConfig {
  /** Whether to log toast messages */
  logToasts: boolean;
}

/**
 * Default configuration for toast notifications
 */
const DEFAULT_CONFIG: ToastConfig = {
  logToasts: true,
};

/**
 * Service for managing toast notifications.
 * Provides consistent user feedback with optional logging.
 */
export class ToastManager {
  /** Current toast configuration */
  private static config: ToastConfig = DEFAULT_CONFIG;

  /**
   * Configure toast notifications.
   * Updates toast settings while preserving defaults.
   * @param config - New toast configuration
   */
  static configure(config: Partial<ToastConfig>): void {
    ToastManager.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Show a success toast.
   * Displays a success message with optional details.
   * @param title - Toast title
   * @param message - Optional toast message
   */
  static async success(title: string, message?: string): Promise<void> {
    if (ToastManager.config.logToasts) {
      info(`Success: ${title}${message ? ` - ${message}` : ""}`);
    }

    await showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  /**
   * Show an error toast.
   * Displays an error message with optional details.
   * @param title - Toast title
   * @param message - Optional toast message
   */
  static async error(title: string, message?: string): Promise<void> {
    if (ToastManager.config.logToasts) {
      error(`Error: ${title}${message ? ` - ${message}` : ""}`);
    }

    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  /**
   * Show a loading toast.
   * Displays a loading indicator with optional message.
   * @param title - Toast title
   * @param message - Optional toast message
   */
  static async loading(title: string, message?: string): Promise<void> {
    if (ToastManager.config.logToasts) {
      info(`Loading: ${title}${message ? ` - ${message}` : ""}`);
    }

    await showToast({
      style: Toast.Style.Animated,
      title,
      message,
    });
  }

  /**
   * Show a progress toast
   * @param title - Toast title
   * @param message - Optional toast message
   * @param progress - Progress value between 0 and 1
   */
  static async progress(title: string, message?: string, progress?: number): Promise<void> {
    if (ToastManager.config.logToasts) {
      info(
        `Progress: ${title}${message ? ` - ${message}` : ""}${
          progress !== undefined ? ` (${Math.round(progress * 100)}%)` : ""
        }`,
      );
    }

    await showToast({
      style: Toast.Style.Animated,
      title,
      message: message ? (progress !== undefined ? `${message} (${Math.round(progress * 100)}%)` : message) : undefined,
    });
  }
}
