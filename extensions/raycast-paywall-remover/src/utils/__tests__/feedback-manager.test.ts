import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FeedbackManager } from "../feedback-manager";
import { ErrorResponse, UrlProcessingResult } from "../../types";

// Mock Raycast API
vi.mock("@raycast/api", () => ({
  showToast: vi.fn(),
  open: vi.fn(),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
}));

// Import mocked functions after mocking
import { showToast, open, Toast } from "@raycast/api";
const mockShowToast = vi.mocked(showToast);
const mockOpen = vi.mocked(open);

describe("FeedbackManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowToast.mockResolvedValue({ style: "animated", title: "", message: "" });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("showLoading", () => {
    it("should show loading toast with default message", async () => {
      await FeedbackManager.showLoading();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "animated",
        title: "Processing...",
      });
    });

    it("should show loading toast with custom message", async () => {
      await FeedbackManager.showLoading("Custom loading message");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "animated",
        title: "Custom loading message",
      });
    });
  });

  describe("showSuccess", () => {
    const mockResult: UrlProcessingResult = {
      originalUrl: "https://example.com/article",
      processedUrl: "https://open.bolha.tools/https://example.com/article",
      success: true,
    };

    it("should show success toast and open URL", async () => {
      await FeedbackManager.showSuccess(mockResult);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "Paywall removed successfully!",
        message: "Opening: https://open.bolha.tools/https://example.com/article",
      });

      expect(mockOpen).toHaveBeenCalledWith(mockResult.processedUrl);
    });

    it("should show success toast with custom message", async () => {
      await FeedbackManager.showSuccess(mockResult, "Custom success message");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "Custom success message",
        message: "Opening: https://open.bolha.tools/https://example.com/article",
      });
    });

    it("should truncate long URLs in success message", async () => {
      const longUrlResult: UrlProcessingResult = {
        originalUrl: "https://example.com/very/long/path/to/article",
        processedUrl: "https://open.bolha.tools/https://example.com/very/long/path/to/article/with/many/segments",
        success: true,
      };

      await FeedbackManager.showSuccess(longUrlResult);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "Paywall removed successfully!",
        message: expect.stringContaining("Opening: open.bolha.tools/https://example.com/very/long/path/to..."),
      });
    });
  });

  describe("showError", () => {
    const mockError: ErrorResponse = {
      type: "validation",
      message: "Invalid URL format",
      suggestion: "Please check the URL and try again",
    };

    it("should show error toast with message and suggestion", async () => {
      await FeedbackManager.showError(mockError);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Invalid URL format",
        message: "Please check the URL and try again",
      });
    });

    it("should show error toast without suggestion", async () => {
      const errorWithoutSuggestion: ErrorResponse = {
        type: "network",
        message: "Network connection failed",
      };

      await FeedbackManager.showError(errorWithoutSuggestion);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Network connection failed",
        message: undefined,
      });
    });
  });

  describe("updateToastSuccess", () => {
    const mockResult: UrlProcessingResult = {
      originalUrl: "https://example.com/article",
      processedUrl: "https://open.bolha.tools/https://example.com/article",
      success: true,
    };

    it("should update toast to success state and open URL", async () => {
      const mockToast = {
        style: "animated",
        title: "Loading...",
        message: "",
      };

      await FeedbackManager.updateToastSuccess(mockToast as unknown as Toast, mockResult);

      expect(mockToast.style).toBe("success");
      expect(mockToast.title).toBe("Paywall removed successfully!");
      expect(mockToast.message).toBe("Opening: https://open.bolha.tools/https://example.com/article");
      expect(mockOpen).toHaveBeenCalledWith(mockResult.processedUrl);
    });

    it("should update toast with custom message", async () => {
      const mockToast = {
        style: "animated",
        title: "Loading...",
        message: "",
      };

      await FeedbackManager.updateToastSuccess(mockToast as unknown as Toast, mockResult, "Custom success");

      expect(mockToast.title).toBe("Custom success");
    });
  });

  describe("updateToastError", () => {
    const mockError: ErrorResponse = {
      type: "validation",
      message: "Invalid URL format",
      suggestion: "Please check the URL and try again",
    };

    it("should update toast to error state", async () => {
      const mockToast = {
        style: "animated",
        title: "Loading...",
        message: "",
      };

      await FeedbackManager.updateToastError(mockToast as unknown as Toast, mockError);

      expect(mockToast.style).toBe("failure");
      expect(mockToast.title).toBe("Invalid URL format");
      expect(mockToast.message).toBe("Please check the URL and try again");
    });
  });

  describe("showProgress", () => {
    it("should show progress toast without percentage", async () => {
      await FeedbackManager.showProgress("Processing data");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "animated",
        title: "Processing data",
      });
    });

    it("should show progress toast with percentage", async () => {
      await FeedbackManager.showProgress("Processing data", 0.75);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "animated",
        title: "Processing data (75%)",
      });
    });
  });

  describe("updateProgress", () => {
    it("should update progress toast without percentage", () => {
      const mockToast = {
        title: "Old title",
      };

      FeedbackManager.updateProgress(mockToast as unknown as Toast, "New progress message");

      expect(mockToast.title).toBe("New progress message");
    });

    it("should update progress toast with percentage", () => {
      const mockToast = {
        title: "Old title",
      };

      FeedbackManager.updateProgress(mockToast as unknown as Toast, "New progress message", 0.5);

      expect(mockToast.title).toBe("New progress message (50%)");
    });
  });

  describe("specific workflow methods", () => {
    it("should show clipboard processing feedback", async () => {
      await FeedbackManager.showClipboardProcessing();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "animated",
        title: "Reading clipboard and processing URL...",
      });
    });

    it("should show current tab processing feedback", async () => {
      await FeedbackManager.showCurrentTabProcessing();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "animated",
        title: "Getting current tab URL and processing...",
      });
    });

    it("should show clipboard success feedback", async () => {
      const mockResult: UrlProcessingResult = {
        originalUrl: "https://example.com/article",
        processedUrl: "https://open.bolha.tools/https://example.com/article",
        success: true,
      };

      await FeedbackManager.showClipboardSuccess(mockResult);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "Clipboard URL processed successfully!",
        message: "Opening: https://open.bolha.tools/https://example.com/article",
      });
    });

    it("should show current tab success feedback", async () => {
      const mockResult: UrlProcessingResult = {
        originalUrl: "https://example.com/article",
        processedUrl: "https://open.bolha.tools/https://example.com/article",
        success: true,
      };

      await FeedbackManager.showCurrentTabSuccess(mockResult);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "Current tab URL processed successfully!",
        message: "Opening: https://open.bolha.tools/https://example.com/article",
      });
    });
  });

  describe("info and warning methods", () => {
    it("should show warning toast", async () => {
      await FeedbackManager.showWarning("Warning title", "Warning message");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "⚠️ Warning title",
        message: "Warning message",
      });
    });

    it("should show info toast", async () => {
      await FeedbackManager.showInfo("Info title", "Info message");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "ℹ️ Info title",
        message: "Info message",
      });
    });

    it("should show default service info", async () => {
      await FeedbackManager.showDefaultServiceInfo();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "ℹ️ Using default service",
        message: "Configure a custom paywall service in preferences",
      });
    });

    it("should show service configured info", async () => {
      await FeedbackManager.showServiceConfigured("https://custom-service.com");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "success",
        title: "ℹ️ Service configured",
        message: "Using: https://custom-service.com",
      });
    });
  });

  describe("error-specific methods", () => {
    it("should show URL validation error", async () => {
      await FeedbackManager.showUrlValidationError("invalid-url");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Invalid URL format",
        message: "Check URL: invalid-url",
      });
    });

    it("should show network error", async () => {
      await FeedbackManager.showNetworkError();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Network error",
        message: "Check your internet connection and try again",
      });
    });

    it("should show browser access error", async () => {
      await FeedbackManager.showBrowserAccessError();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Browser access error",
        message: "Open a supported browser and try again",
      });
    });

    it("should show clipboard access error", async () => {
      await FeedbackManager.showClipboardAccessError();

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Clipboard access error",
        message: "Copy a URL to your clipboard and try again",
      });
    });
  });

  describe("processWithFeedback", () => {
    it("should handle successful operation", async () => {
      const mockOperation = vi.fn().mockResolvedValue("success result");
      const mockSuccessHandler = vi.fn();

      const result = await FeedbackManager.processWithFeedback(mockOperation, "Processing...", mockSuccessHandler);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "animated",
        title: "Processing...",
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(mockSuccessHandler).toHaveBeenCalledWith("success result");
      expect(result).toBe("success result");
    });

    it("should handle failed operation", async () => {
      const mockError = new Error("Operation failed");
      const mockOperation = vi.fn().mockRejectedValue(mockError);
      const mockErrorHandler = vi.fn();

      const result = await FeedbackManager.processWithFeedback(
        mockOperation,
        "Processing...",
        undefined,
        mockErrorHandler
      );

      expect(mockOperation).toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
      expect(result).toBeNull();
    });

    it("should use default handlers when not provided", async () => {
      const mockOperation = vi.fn().mockResolvedValue("success result");
      const mockToast = { style: "animated", title: "Processing...", message: "" };
      mockShowToast.mockResolvedValue(mockToast);

      const result = await FeedbackManager.processWithFeedback(mockOperation, "Processing...");

      expect(mockToast.style).toBe("success");
      expect(mockToast.title).toBe("Operation completed successfully");
      expect(result).toBe("success result");
    });
  });

  describe("handleErrorWithFeedback", () => {
    it("should handle ErrorResponse objects", async () => {
      const mockError: ErrorResponse = {
        type: "validation",
        message: "Invalid URL",
        suggestion: "Check the URL format",
      };

      await FeedbackManager.handleErrorWithFeedback(mockError);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Invalid URL",
        message: "Check the URL format",
      });
    });

    it("should handle Error objects", async () => {
      const mockError = new Error("Something went wrong");

      await FeedbackManager.handleErrorWithFeedback(mockError);

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "An error occurred",
        message: "Something went wrong",
      });
    });

    it("should handle unknown error types", async () => {
      await FeedbackManager.handleErrorWithFeedback("unknown error");

      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "An unexpected error occurred",
        message: "Please try again",
      });
    });
  });
});
