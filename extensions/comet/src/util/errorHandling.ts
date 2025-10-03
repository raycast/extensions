import { showToast, Toast, open } from "@raycast/api";

export enum ErrorType {
  INSTALLATION = "INSTALLATION",
  PROFILE = "PROFILE",
  DATABASE = "DATABASE",
  NETWORK = "NETWORK",
  PERMISSION = "PERMISSION",
  UNKNOWN = "UNKNOWN",
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: string;
}

export class ErrorHandler {
  static createError(type: ErrorType, message: string, originalError?: Error, context?: string): AppError {
    return {
      type,
      message,
      originalError,
      context,
    };
  }

  static async handleError(error: AppError): Promise<void> {
    const toastOptions: Toast.Options = {
      style: Toast.Style.Failure,
      title: this.getErrorTitle(error.type),
      message: error.message,
    };

    // Add specific actions based on error type
    switch (error.type) {
      case ErrorType.INSTALLATION:
        toastOptions.primaryAction = {
          title: "Download Comet Browser",
          onAction: async (toast) => {
            await open("https://comet.perplexity.ai/");
            toast.hide();
          },
        };
        break;

      case ErrorType.PROFILE:
        toastOptions.primaryAction = {
          title: "Open Extension Settings",
          onAction: async (toast) => {
            // This would open extension preferences
            toast.hide();
          },
        };
        break;

      case ErrorType.DATABASE:
        toastOptions.primaryAction = {
          title: "Retry",
          onAction: (toast) => {
            toast.hide();
            // Trigger a revalidation
            window.location.reload();
          },
        };
        break;
    }

    await showToast(toastOptions);
  }

  private static getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.INSTALLATION:
        return "Comet Browser Not Found";
      case ErrorType.PROFILE:
        return "Profile Configuration Error";
      case ErrorType.DATABASE:
        return "Database Access Error";
      case ErrorType.NETWORK:
        return "Network Error";
      case ErrorType.PERMISSION:
        return "Permission Denied";
      case ErrorType.UNKNOWN:
      default:
        return "Unexpected Error";
    }
  }

  static isRetryableError(error: AppError): boolean {
    return error.type === ErrorType.DATABASE || error.type === ErrorType.NETWORK;
  }

  static getRetryDelay(error: AppError): number {
    switch (error.type) {
      case ErrorType.DATABASE:
        return 1000; // 1 second
      case ErrorType.NETWORK:
        return 2000; // 2 seconds
      default:
        return 0;
    }
  }
}
