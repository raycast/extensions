import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RemoveFromCurrentTab from "../../remove-from-current-tab";
import { BrowserIntegration } from "../../utils/browser-integration";
import { PaywallServiceClient } from "../../utils/service-client";
import { FeedbackManager } from "../../utils/feedback-manager";
import { ErrorHandler } from "../../utils/error-handler";

// Mock all dependencies
vi.mock("../../utils/browser-integration");
vi.mock("../../utils/service-client");
vi.mock("../../utils/feedback-manager");
vi.mock("../../utils/error-handler");

describe("RemoveFromCurrentTab Integration Tests", () => {
  const mockToast = { id: "test-toast" };
  const testUrl = "https://example.com/article";
  const processedUrl = "https://12ft.io/https://example.com/article";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(FeedbackManager.showCurrentTabProcessing).mockResolvedValue(mockToast);
    vi.mocked(FeedbackManager.updateToastSuccess).mockResolvedValue(undefined);
    vi.mocked(FeedbackManager.updateToastError).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("End-to-end current tab URL processing workflow", () => {
    it("should successfully process current tab URL and open result", async () => {
      // Arrange - Requirements 2.1, 2.2, 2.3
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(testUrl);
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockResolvedValue(processedUrl);

      // Act
      await RemoveFromCurrentTab();

      // Assert - Verify complete workflow
      expect(FeedbackManager.showCurrentTabProcessing).toHaveBeenCalledOnce();
      expect(BrowserIntegration.getCurrentTabUrl).toHaveBeenCalledOnce();
      expect(PaywallServiceClient.prototype.removePaywall).toHaveBeenCalledWith(testUrl);
      expect(FeedbackManager.updateToastSuccess).toHaveBeenCalledWith(
        mockToast,
        {
          originalUrl: testUrl,
          processedUrl: processedUrl,
          success: true,
        },
        "Current tab URL processed successfully!"
      );
    });

    it("should handle no active browser tab scenario", async () => {
      // Arrange - Requirement 2.4
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(null);
      const mockError = { type: "browser", message: "No active browser tab detected" };
      vi.mocked(ErrorHandler.createBrowserError).mockReturnValue(mockError);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(FeedbackManager.showCurrentTabProcessing).toHaveBeenCalledOnce();
      expect(BrowserIntegration.getCurrentTabUrl).toHaveBeenCalledOnce();
      expect(ErrorHandler.createBrowserError).toHaveBeenCalledWith("noActiveTab");
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockError);
      expect(PaywallServiceClient.prototype.removePaywall).not.toHaveBeenCalled();
    });

    it("should handle service errors gracefully", async () => {
      // Arrange - Requirements 4.3, 4.4
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(testUrl);
      const serviceError = new Error("Service unavailable");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(serviceError);
      const mockErrorResponse = { type: "network", message: "Service unavailable" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(FeedbackManager.showCurrentTabProcessing).toHaveBeenCalledOnce();
      expect(BrowserIntegration.getCurrentTabUrl).toHaveBeenCalledOnce();
      expect(PaywallServiceClient.prototype.removePaywall).toHaveBeenCalledWith(testUrl);
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(serviceError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });

    it("should handle browser integration errors", async () => {
      // Arrange
      const browserError = new Error("Browser access denied");
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockRejectedValue(browserError);
      const mockErrorResponse = { type: "browser", message: "Cannot access browser tab" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(FeedbackManager.showCurrentTabProcessing).toHaveBeenCalledOnce();
      expect(BrowserIntegration.getCurrentTabUrl).toHaveBeenCalledOnce();
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(browserError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
      expect(PaywallServiceClient.prototype.removePaywall).not.toHaveBeenCalled();
    });
  });

  describe("Browser integration scenarios", () => {
    it("should handle different browser types", async () => {
      // Arrange
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(testUrl);
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockResolvedValue(processedUrl);

      // Act
      await RemoveFromCurrentTab();

      // Assert - Verify browser integration is called
      expect(BrowserIntegration.getCurrentTabUrl).toHaveBeenCalledOnce();
      expect(PaywallServiceClient.prototype.removePaywall).toHaveBeenCalledWith(testUrl);
    });

    it("should handle browser permission errors", async () => {
      // Arrange
      const permissionError = new Error("Permission denied to access browser");
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockRejectedValue(permissionError);
      const mockErrorResponse = { type: "browser", message: "Browser permission denied" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(permissionError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });

    it("should handle browser not found scenarios", async () => {
      // Arrange
      const browserNotFoundError = new Error("No supported browser found");
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockRejectedValue(browserNotFoundError);
      const mockErrorResponse = { type: "browser", message: "No supported browser found" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(browserNotFoundError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });
  });

  describe("Error scenarios and edge cases", () => {
    it("should handle network timeout errors", async () => {
      // Arrange
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(testUrl);
      const timeoutError = new Error("Request timeout");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(timeoutError);
      const mockErrorResponse = { type: "network", message: "Request timed out" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(timeoutError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });

    it("should handle service configuration errors", async () => {
      // Arrange
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(testUrl);
      const configError = new Error("Invalid service URL configuration");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(configError);
      const mockErrorResponse = { type: "configuration", message: "Service URL is invalid" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(configError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });

    it("should handle unexpected errors during processing", async () => {
      // Arrange
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(testUrl);
      const unexpectedError = new Error("Unexpected error");
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockRejectedValue(unexpectedError);
      const mockErrorResponse = { type: "network", message: "An unexpected error occurred" };
      vi.mocked(ErrorHandler.handleUnknownError).mockReturnValue(mockErrorResponse);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(ErrorHandler.handleUnknownError).toHaveBeenCalledWith(unexpectedError);
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockErrorResponse);
    });
  });

  describe("Feedback and loading states", () => {
    it("should show loading state throughout the process", async () => {
      // Arrange
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(testUrl);
      vi.mocked(PaywallServiceClient.prototype.removePaywall).mockResolvedValue(processedUrl);

      // Act
      await RemoveFromCurrentTab();

      // Assert - Verify all expected calls were made in correct order
      expect(FeedbackManager.showCurrentTabProcessing).toHaveBeenCalledOnce();
      expect(BrowserIntegration.getCurrentTabUrl).toHaveBeenCalledOnce();
      expect(PaywallServiceClient.prototype.removePaywall).toHaveBeenCalledOnce();
      expect(FeedbackManager.updateToastSuccess).toHaveBeenCalledOnce();
    });

    it("should update toast with error when processing fails", async () => {
      // Arrange
      vi.mocked(BrowserIntegration.getCurrentTabUrl).mockResolvedValue(null);
      const mockError = { type: "browser", message: "No active tab found" };
      vi.mocked(ErrorHandler.createBrowserError).mockReturnValue(mockError);

      // Act
      await RemoveFromCurrentTab();

      // Assert
      expect(FeedbackManager.updateToastError).toHaveBeenCalledWith(mockToast, mockError);
      expect(FeedbackManager.updateToastSuccess).not.toHaveBeenCalled();
    });
  });
});
