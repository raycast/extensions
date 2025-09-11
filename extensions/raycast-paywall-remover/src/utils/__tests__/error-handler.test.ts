import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorHandler } from "../error-handler";
import { ErrorResponse } from "../../types";

describe("ErrorHandler", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock console.error to test logging
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("createError", () => {
    it("should create a validation error with message and suggestion", () => {
      const error = ErrorHandler.createError("validation", "invalidUrl");

      expect(error).toEqual({
        type: "validation",
        message: "The URL format is invalid. Please check that it starts with http:// or https://",
        suggestion: "Copy a complete URL starting with http:// or https://",
      });
    });

    it("should create a network error with message and suggestion", () => {
      const error = ErrorHandler.createError("network", "connectionFailed");

      expect(error).toEqual({
        type: "network",
        message: "Unable to connect to the paywall removal service",
        suggestion: "Check your internet connection and try again",
      });
    });

    it("should create a configuration error with message and suggestion", () => {
      const error = ErrorHandler.createError("configuration", "invalidServiceUrl");

      expect(error).toEqual({
        type: "configuration",
        message: "The configured paywall service URL is invalid",
        suggestion: "Update the service URL in extension preferences",
      });
    });

    it("should create a browser error with message and suggestion", () => {
      const error = ErrorHandler.createError("browser", "noBrowserFound");

      expect(error).toEqual({
        type: "browser",
        message: "No supported browser is currently running",
        suggestion: "Open a supported browser (Chrome, Safari, Firefox, or Edge)",
      });
    });

    it("should log error information when creating error", () => {
      ErrorHandler.createError("validation", "invalidUrl", new Error("Test error"));

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PaywallRemover Error]",
        expect.objectContaining({
          type: "validation",
          specificError: "invalidUrl",
          timestamp: expect.any(String),
          originalMessage: "Test error",
        })
      );
    });

    it("should handle unknown error keys gracefully", () => {
      const error = ErrorHandler.createError("validation", "unknownError");

      expect(error.type).toBe("validation");
      expect(error.message).toBe("An unexpected validation error occurred");
      expect(error.suggestion).toBeUndefined();
    });
  });

  describe("specific error creators", () => {
    it("should create validation errors", () => {
      const error = ErrorHandler.createValidationError("emptyUrl");

      expect(error.type).toBe("validation");
      expect(error.message).toBe("No URL found. Please copy a valid URL to your clipboard or navigate to a webpage");
      expect(error.suggestion).toBe("Copy a URL to your clipboard or open a webpage in your browser");
    });

    it("should create network errors", () => {
      const error = ErrorHandler.createNetworkError("timeout");

      expect(error.type).toBe("network");
      expect(error.message).toBe("The request timed out. Please check your internet connection and try again");
      expect(error.suggestion).toBe("Try again with a stable internet connection");
    });

    it("should create configuration errors", () => {
      const error = ErrorHandler.createConfigurationError("missingServiceUrl");

      expect(error.type).toBe("configuration");
      expect(error.message).toBe("No paywall service URL configured. Please set one in preferences");
      expect(error.suggestion).toBe("Configure a paywall service URL in extension preferences");
    });

    it("should create browser errors", () => {
      const error = ErrorHandler.createBrowserError("noActiveTab");

      expect(error.type).toBe("browser");
      expect(error.message).toBe("No active browser tab found");
      expect(error.suggestion).toBe("Open a webpage in your browser and try again");
    });

    it("should create service errors", () => {
      const error = ErrorHandler.createServiceError("processingFailed");

      expect(error.type).toBe("service");
      expect(error.message).toBe("Failed to process the URL through the paywall removal service");
      expect(error.suggestion).toBe("Try again or check if the URL is accessible");
    });

    it("should create clipboard errors", () => {
      const error = ErrorHandler.createClipboardError("accessDenied");

      expect(error.type).toBe("clipboard");
      expect(error.message).toBe("Unable to access clipboard. Please grant clipboard permissions");
      expect(error.suggestion).toBe("Grant Raycast permission to access your clipboard");
    });

    it("should create timeout errors", () => {
      const error = ErrorHandler.createTimeoutError("operationTimeout");

      expect(error.type).toBe("timeout");
      expect(error.message).toBe("The operation timed out. Please try again");
      expect(error.suggestion).toBe("Try again with a stable connection");
    });
  });

  describe("handleUnknownError", () => {
    it("should categorize network errors from Error objects", () => {
      const networkError = new Error("Network connection failed");
      const error = ErrorHandler.handleUnknownError(networkError);

      expect(error.type).toBe("network");
      expect(error.message).toBe("Unable to connect to the paywall removal service");
    });

    it("should categorize timeout errors from Error objects", () => {
      const timeoutError = new Error("Operation timeout exceeded");
      const error = ErrorHandler.handleUnknownError(timeoutError);

      expect(error.type).toBe("timeout");
      expect(error.message).toBe("The operation timed out. Please try again");
    });

    it("should categorize URL validation errors from Error objects", () => {
      const urlError = new Error("Invalid URL format provided");
      const error = ErrorHandler.handleUnknownError(urlError);

      expect(error.type).toBe("validation");
      expect(error.message).toBe("The URL format is invalid. Please check that it starts with http:// or https://");
    });

    it("should categorize browser errors from Error objects", () => {
      const browserError = new Error("Browser access denied");
      const error = ErrorHandler.handleUnknownError(browserError);

      expect(error.type).toBe("browser");
      expect(error.message).toBe("No supported browser is currently running");
    });

    it("should categorize clipboard errors from Error objects", () => {
      const clipboardError = new Error("Clipboard access failed");
      const error = ErrorHandler.handleUnknownError(clipboardError);

      expect(error.type).toBe("clipboard");
      expect(error.message).toBe("Unable to access clipboard. Please grant clipboard permissions");
    });

    it("should default to service error for unknown errors", () => {
      const unknownError = new Error("Something went wrong");
      const error = ErrorHandler.handleUnknownError(unknownError);

      expect(error.type).toBe("service");
      expect(error.message).toBe("Failed to process the URL through the paywall removal service");
    });

    it("should handle non-Error objects", () => {
      const stringError = "Something went wrong";
      const error = ErrorHandler.handleUnknownError(stringError);

      expect(error.type).toBe("service");
      expect(error.message).toBe("Failed to process the URL through the paywall removal service");
    });

    it("should handle null/undefined errors", () => {
      const error1 = ErrorHandler.handleUnknownError(null);
      const error2 = ErrorHandler.handleUnknownError(undefined);

      expect(error1.type).toBe("service");
      expect(error2.type).toBe("service");
    });
  });

  describe("utility methods", () => {
    it("should validate error response format", () => {
      const validError: ErrorResponse = {
        type: "validation",
        message: "Test message",
        suggestion: "Test suggestion",
      };

      const invalidError1 = { type: "validation" }; // missing message
      const invalidError2 = { message: "Test" }; // missing type
      const invalidError3 = null;

      expect(ErrorHandler.isValidErrorResponse(validError)).toBe(true);
      expect(ErrorHandler.isValidErrorResponse(invalidError1)).toBe(false);
      expect(ErrorHandler.isValidErrorResponse(invalidError2)).toBe(false);
      expect(ErrorHandler.isValidErrorResponse(invalidError3)).toBe(false);
    });

    it("should return available error types", () => {
      const types = ErrorHandler.getAvailableErrorTypes();

      expect(types).toEqual(["validation", "network", "configuration", "browser", "service", "clipboard", "timeout"]);
    });

    it("should get error message for specific type and key", () => {
      const message = ErrorHandler.getErrorMessage("validation", "invalidUrl");

      expect(message).toBe("The URL format is invalid. Please check that it starts with http:// or https://");
    });

    it("should get error suggestion for specific type and key", () => {
      const suggestion = ErrorHandler.getErrorSuggestion("validation", "invalidUrl");

      expect(suggestion).toBe("Copy a complete URL starting with http:// or https://");
    });

    it("should return undefined for unknown error message keys", () => {
      const message = ErrorHandler.getErrorMessage("validation", "unknownKey");

      expect(message).toBeUndefined();
    });

    it("should return undefined for unknown error suggestion keys", () => {
      const suggestion = ErrorHandler.getErrorSuggestion("validation", "unknownKey");

      expect(suggestion).toBeUndefined();
    });
  });

  describe("error message coverage", () => {
    it("should have messages for all validation error types", () => {
      const validationKeys = ["invalidUrl", "emptyUrl", "malformedUrl", "unsupportedProtocol", "multipleUrls"];

      validationKeys.forEach((key) => {
        const message = ErrorHandler.getErrorMessage("validation", key);
        const suggestion = ErrorHandler.getErrorSuggestion("validation", key);

        expect(message).toBeDefined();
        expect(suggestion).toBeDefined();
      });
    });

    it("should have messages for all network error types", () => {
      const networkKeys = ["connectionFailed", "timeout", "serviceUnavailable", "dnsError"];

      networkKeys.forEach((key) => {
        const message = ErrorHandler.getErrorMessage("network", key);
        const suggestion = ErrorHandler.getErrorSuggestion("network", key);

        expect(message).toBeDefined();
        expect(suggestion).toBeDefined();
      });
    });

    it("should have messages for all configuration error types", () => {
      const configKeys = ["invalidServiceUrl", "missingServiceUrl", "serviceUrlFormat", "defaultServiceFallback"];

      configKeys.forEach((key) => {
        const message = ErrorHandler.getErrorMessage("configuration", key);
        const suggestion = ErrorHandler.getErrorSuggestion("configuration", key);

        expect(message).toBeDefined();
        expect(suggestion).toBeDefined();
      });
    });

    it("should have messages for all browser error types", () => {
      const browserKeys = ["noBrowserFound", "noActiveTab", "browserAccessDenied", "unsupportedBrowser"];

      browserKeys.forEach((key) => {
        const message = ErrorHandler.getErrorMessage("browser", key);
        const suggestion = ErrorHandler.getErrorSuggestion("browser", key);

        expect(message).toBeDefined();
        expect(suggestion).toBeDefined();
      });
    });
  });
});
