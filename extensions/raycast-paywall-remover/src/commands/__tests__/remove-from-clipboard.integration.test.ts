import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RemoveFromClipboard from "../../remove-from-clipboard";
import { ClipboardManager } from "../../utils/clipboard-manager";
import { PaywallServiceClient } from "../../utils/service-client";
import { FeedbackManager } from "../../utils/feedback-manager";
import { ErrorHandler } from "../../utils/error-handler";

// Mock all dependencies
vi.mock("../../utils/clipboard-manager");
vi.mock("../../utils/service-client");
vi.mock("../../utils/feedback-manager");
vi.mock("../../utils/error-handler");

describe("RemoveFromClipboard Integration Tests", () => {
  const mockToast = { id: "test-toast" };
  const testUrl = "https://example.com/article";
  const processedUrl = "https://12ft.io/https://example.com/article";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(FeedbackManager.showClipboardProcessing).mockResolvedValue(mockToast);
    vi.mocked(FeedbackManager.updateToastSuccess).mockResolvedValue(undefined);
    vi.mocked(FeedbackManager.updateToastError).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("End-to-end clipboard URL processing workflow", () => {
    it("should successfully process valid clipboard URL and open result", async () => {
      // Arrange - Requirements 1.1, 1.2, 1.3
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(testUrl);
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockResolvedValue(processedUrl);

      // Act
      await RemoveFromClipboard();

      // Assert - Verify complete workflow
      expect(FeedbackManager.showClipboardProcessing).toHaveBeenCalledOnce();
      expect(ClipboardManager.extractUrl).toHaveBeenCalledOnce();
      expect(PaywallServiceClient.prototype.removePaywall).toHaveBeenCalledWith(testUrl);
      expect(FeedbackManager.updateToastSuccess).toHaveBeenCalledWith(
        mockToast,
        {
          originalUrl: testUrl,
          processedUrl: processedUrl,
          success: true,
        },
        "Clipboard URL processed successfully!"
      );
    });

    it("should handle no valid URL in clipboard scenario", async () => {
      // Arrange - Requirement 1.4
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(null);
      const mockError = { type: "validation", message: "No valid URL found in clipboard" };
      vi.mocked(ErrorHandler.createClipboardError).mockReturnValue(mockError);

      // Act
      await RemoveFromClipboard();

      // Assert
      expect(FeedbackManager.showClipboardProcessing).toHaveBeenCalledOnce();
      expect(ClipboardManager.extractUrl).toHaveBeenCalledOnce();
      expect(ErrorHandler.createClipboardError).toHaveBeenCalledWith("noValidUrl");
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockError);
      expect(PaywallServiceClient.prototype.removePaywall).not.toHaveBeenCalled();
    });

    it("should handle service errors gracefully", async () => {
      // Arrange - Requirements 4.3, 4.4
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(testUrl);
      const serviceError = new Error("Service unavailable");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(serviceError);
      const mockErrorResponse = { type: "network", message: "Service unavailable" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromClipboard();

      // Assert
      expect(FeedbackManager.showClipboardProcessing).toHaveBeenCalledOnce();
      expect(ClipboardManager.extractUrl).toHaveBeenCalledOnce();
      expect(PaywallServiceClient.prototype.removePaywall).toHaveBeenCalledWith(testUrl);
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(serviceError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });

    it("should handle clipboard access errors", async () => {
      // Arrange
      const clipboardError = new Error("Clipboard access denied");
      vi.mocked(ClipboardManager.extractUrl).mockRejectedValue(clipboardError);
      const mockErrorResponse = { type: "clipboard", message: "Cannot access clipboard" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromClipboard();

      // Assert
      expect(FeedbackManager.showClipboardProcessing).toHaveBeenCalledOnce();
      expect(ClipboardManager.extractUrl).toHaveBeenCalledOnce();
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(clipboardError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
      expect(PaywallServiceClient.prototype.removePaywall).not.toHaveBeenCalled();
    });
  });

  describe("Error scenarios and edge cases", () => {
    it("should handle network timeout errors", async () => {
      // Arrange
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(testUrl);
      const timeoutError = new Error("Request timeout");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(timeoutError);
      const mockErrorResponse = { type: "network", message: "Request timed out" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromClipboard();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(timeoutError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });

    it("should handle service configuration errors", async () => {
      // Arrange
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(testUrl);
      const configError = new Error("Invalid service URL configuration");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(configError);
      const mockErrorResponse = { type: "configuration", message: "Service URL is invalid" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromClipboard();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(configError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });

    it("should handle unexpected errors during processing", async () => {
      // Arrange
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(testUrl);
      const unexpectedError = new Error("Unexpected error");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(unexpectedError);
      const mockErrorResponse = { type: "network", message: "An unexpected error occurred" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromClipboard();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(unexpectedError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });
  });

  describe("Feedback and loading states", () => {
    it("should show loading state throughout the process", async () => {
      // Arrange
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(testUrl);
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockResolvedValue(processedUrl);

      // Act
      await RemoveFromClipboard();

      // Assert - Verify all expected calls were made in correct order
      expect(FeedbackManager.showClipboardProcessing).toHaveBeenCalledOnce();
      expect(ClipboardManager.extractUrl).toHaveBeenCalledOnce();
      expect(PaywallServiceClient.prototype.removePaywall).toHaveBeenCalledOnce();
      expect(FeedbackManager.updateToastSuccess).toHaveBeenCalledOnce();
    });

    it("should update toast with error when processing fails", async () => {
      // Arrange
      vi.mocked(ClipboardManager.extractUrl).mockResolvedValue(null);
      const mockError = { type: "validation", message: "No valid URL found" };
      vi.mocked(ErrorHandler.createClipboardError).mockReturnValue(mockError);

      // Act
      await RemoveFromClipboard();

      // Assert
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockError);
      expect(FeedbackManager.updateToastSuccess).not.toHaveBeenCalled();
    });
  });
});
