import { ErrorResponse, ErrorType } from "../types";

/**
 * Comprehensive error handling utilities for the Raycast Paywall Remover extension
 * Implements requirements 4.3, 4.4, 1.4, 2.4 for error categorization and user-friendly messaging
 */
export class ErrorHandler {
  /**
   * Error message templates for different error categories
   * Requirement 4.3: Clear error messages with specific reasons
   */
  private static readonly ERROR_MESSAGES = {
    validation: {
      invalidUrl: "The URL format is invalid. Please check that it starts with http:// or https://",
      emptyUrl: "No URL found. Please copy a valid URL to your clipboard or navigate to a webpage",
      malformedUrl: "The URL appears to be malformed or incomplete",
      unsupportedProtocol: "Only HTTP and HTTPS URLs are supported",
      multipleUrls: "Multiple URLs detected. Only the first valid URL will be processed",
    },
    network: {
      connectionFailed: "Unable to connect to the paywall removal service",
      timeout: "The request timed out. Please check your internet connection and try again",
      serviceUnavailable: "The paywall removal service is currently unavailable",
      dnsError: "Unable to resolve the service URL. Please check your network connection",
    },
    configuration: {
      invalidServiceUrl: "The configured paywall service URL is invalid",
      missingServiceUrl: "No paywall service URL configured. Please set one in preferences",
      serviceUrlFormat: "Service URL must be in the format: https://domain.com",
      defaultServiceFallback: "Using default service due to invalid configuration",
    },
    browser: {
      noBrowserFound: "No supported browser is currently running",
      noActiveTab: "No active browser tab found",
      browserAccessDenied: "Unable to access browser information. Please grant necessary permissions",
      unsupportedBrowser: "The current browser is not supported for tab URL extraction",
      zenBrowserDetected: "Zen browser detected but tab URL extraction is limited",
    },
    service: {
      processingFailed: "Failed to process the URL through the paywall removal service",
      invalidResponse: "Received an invalid response from the paywall removal service",
      serviceError: "The paywall removal service encountered an error",
    },
    clipboard: {
      accessDenied: "Unable to access clipboard. Please grant clipboard permissions",
      emptyClipboard: "Clipboard is empty or contains no text",
      noValidUrl: "No valid URL found in clipboard content",
    },
    timeout: {
      operationTimeout: "The operation timed out. Please try again",
      browserTimeout: "Timed out while trying to get browser tab information",
      serviceTimeout: "Timed out while connecting to the paywall removal service",
    },
  };

  /**
   * Error suggestions for helping users resolve issues
   * Requirement 4.4: Provide specific connectivity error feedback
   */
  private static readonly ERROR_SUGGESTIONS = {
    validation: {
      invalidUrl: "Copy a complete URL starting with http:// or https://",
      emptyUrl: "Copy a URL to your clipboard or open a webpage in your browser",
      malformedUrl: "Ensure the URL is complete and properly formatted",
      unsupportedProtocol: "Use URLs that start with http:// or https://",
      multipleUrls: "Copy only one URL at a time for best results",
    },
    network: {
      connectionFailed: "Check your internet connection and try again",
      timeout: "Try again with a stable internet connection",
      serviceUnavailable: "Try again later or configure a different paywall service",
      dnsError: "Check your network settings and DNS configuration",
    },
    configuration: {
      invalidServiceUrl: "Update the service URL in extension preferences",
      missingServiceUrl: "Configure a paywall service URL in extension preferences",
      serviceUrlFormat: "Use format: https://13ft.io or https://your-service.com",
      defaultServiceFallback: "Check your service URL configuration in preferences",
    },
    browser: {
      noBrowserFound: "Open a supported browser (Chrome, Safari, Firefox, or Edge)",
      noActiveTab: "Open a webpage in your browser and try again",
      browserAccessDenied: "Grant Raycast permission to access browser information",
      unsupportedBrowser: "Use Chrome, Safari, Firefox, or Edge for tab URL extraction",
      zenBrowserDetected: "For Zen browser: Copy URL (Cmd+L then Cmd+C) and use 'Remove Paywall from Clipboard URL'",
    },
    service: {
      processingFailed: "Try again or check if the URL is accessible",
      invalidResponse: "Try again or configure a different paywall service",
      serviceError: "Try again later or contact the service provider",
    },
    clipboard: {
      accessDenied: "Grant Raycast permission to access your clipboard",
      emptyClipboard: "Copy a URL to your clipboard and try again",
      noValidUrl: "Copy a valid webpage URL to your clipboard",
    },
    timeout: {
      operationTimeout: "Try again with a stable connection",
      browserTimeout: "Ensure your browser is running and try again",
      serviceTimeout: "Try again or check your internet connection",
    },
  };

  /**
   * Creates a standardized error response with user-friendly messaging
   * Requirement 4.3: Clear error messages with specific reasons
   * Requirement 4.4: Specific connectivity error feedback
   */
  static createError(type: ErrorType, specificError: string, originalError?: Error | string): ErrorResponse {
    const errorKey = specificError as keyof (typeof ErrorHandler.ERROR_MESSAGES)[typeof type];
    const message = ErrorHandler.ERROR_MESSAGES[type]?.[errorKey] || `An unexpected ${type} error occurred`;

    const suggestionKey = specificError as keyof (typeof ErrorHandler.ERROR_SUGGESTIONS)[typeof type];
    const suggestion = ErrorHandler.ERROR_SUGGESTIONS[type]?.[suggestionKey];

    // Log error details for debugging while respecting user privacy
    ErrorHandler.logError(type, specificError, originalError);

    return {
      type,
      message,
      suggestion,
    };
  }

  /**
   * Creates a validation error for URL-related issues
   * Requirement 1.4: Error handling for invalid URLs in clipboard
   * Requirement 5.1: Handle various URL formats and edge cases
   */
  static createValidationError(specificError: keyof typeof ErrorHandler.ERROR_MESSAGES.validation): ErrorResponse {
    return ErrorHandler.createError("validation", specificError);
  }

  /**
   * Creates a network error for connectivity issues
   * Requirement 4.4: Specific connectivity error feedback
   */
  static createNetworkError(specificError: keyof typeof ErrorHandler.ERROR_MESSAGES.network): ErrorResponse {
    return ErrorHandler.createError("network", specificError);
  }

  /**
   * Creates a configuration error for service setup issues
   * Requirement 4.3: Error handling for service configuration
   */
  static createConfigurationError(
    specificError: keyof typeof ErrorHandler.ERROR_MESSAGES.configuration
  ): ErrorResponse {
    return ErrorHandler.createError("configuration", specificError);
  }

  /**
   * Creates a browser error for tab access issues
   * Requirement 2.4: Error handling for browser access failures
   */
  static createBrowserError(specificError: keyof typeof ErrorHandler.ERROR_MESSAGES.browser): ErrorResponse {
    return ErrorHandler.createError("browser", specificError);
  }

  /**
   * Creates a service error for paywall removal issues
   * Requirement 4.3: Error handling for service connectivity issues
   */
  static createServiceError(specificError: keyof typeof ErrorHandler.ERROR_MESSAGES.service): ErrorResponse {
    return ErrorHandler.createError("service", specificError);
  }

  /**
   * Creates a clipboard error for clipboard access issues
   * Requirement 1.4: Error handling for clipboard access
   */
  static createClipboardError(specificError: keyof typeof ErrorHandler.ERROR_MESSAGES.clipboard): ErrorResponse {
    return ErrorHandler.createError("clipboard", specificError);
  }

  /**
   * Creates a timeout error for operation timeouts
   * Requirement 4.3: Error handling for timeout scenarios
   */
  static createTimeoutError(specificError: keyof typeof ErrorHandler.ERROR_MESSAGES.timeout): ErrorResponse {
    return ErrorHandler.createError("timeout", specificError);
  }

  /**
   * Handles and categorizes unknown errors
   * Requirement 4.3: Handle unexpected errors gracefully
   */
  static handleUnknownError(error: unknown): ErrorResponse {
    if (error instanceof Error) {
      // Try to categorize based on error message
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("network") || errorMessage.includes("connection")) {
        return ErrorHandler.createNetworkError("connectionFailed");
      }

      if (errorMessage.includes("timeout")) {
        return ErrorHandler.createTimeoutError("operationTimeout");
      }

      if (errorMessage.includes("url") || errorMessage.includes("invalid")) {
        return ErrorHandler.createValidationError("invalidUrl");
      }

      if (errorMessage.includes("browser")) {
        return ErrorHandler.createBrowserError("noBrowserFound");
      }

      if (errorMessage.includes("clipboard")) {
        return ErrorHandler.createClipboardError("accessDenied");
      }
    }

    // Default to service error for unknown issues
    return ErrorHandler.createServiceError("processingFailed");
  }

  /**
   * Logs error information for debugging while respecting user privacy
   * Requirement 4.3: Add error logging while respecting user privacy
   */
  private static logError(type: ErrorType, specificError: string, originalError?: Error | string): void {
    // Only log error types and categories, not sensitive URL information
    const logData = {
      type,
      specificError,
      timestamp: new Date().toISOString(),
      // Only include error message, not full error object to avoid logging sensitive data
      originalMessage: originalError instanceof Error ? originalError.message : originalError,
    };

    // Use console.error for error logging in development
    // In production, this could be replaced with a proper logging service
    console.error("[PaywallRemover Error]", logData);
  }

  /**
   * Validates if an error response is properly formatted
   * Utility method for testing and validation
   */
  static isValidErrorResponse(error: unknown): error is ErrorResponse {
    return (
      error !== null &&
      error !== undefined &&
      typeof error === "object" &&
      typeof error.type === "string" &&
      typeof error.message === "string" &&
      (error.suggestion === undefined || typeof error.suggestion === "string")
    );
  }

  /**
   * Gets all available error types for testing purposes
   */
  static getAvailableErrorTypes(): ErrorType[] {
    return ["validation", "network", "configuration", "browser", "service", "clipboard", "timeout"];
  }

  /**
   * Gets error message template for a specific error type and key
   * Useful for testing and validation
   */
  static getErrorMessage(type: ErrorType, key: string): string | undefined {
    const typeMessages = ErrorHandler.ERROR_MESSAGES[type] as Record<string, string> | undefined;
    return typeMessages?.[key];
  }

  /**
   * Gets error suggestion for a specific error type and key
   * Useful for testing and validation
   */
  static getErrorSuggestion(type: ErrorType, key: string): string | undefined {
    const typeSuggestions = ErrorHandler.ERROR_SUGGESTIONS[type] as Record<string, string> | undefined;
    return typeSuggestions?.[key];
  }
}
