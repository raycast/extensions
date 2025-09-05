import { BrowserIntegration } from "./utils/browser-integration";
import { PaywallServiceClient } from "./utils/service-client";
import { FeedbackManager } from "./utils/feedback-manager";
import { ErrorHandler } from "./utils/error-handler";
import { UrlProcessingResult } from "./types";

/**
 * Command to remove paywall from current browser tab URL
 * Requirements: 2.1, 2.2, 2.3, 4.1, 4.2
 */
export default async function RemoveFromCurrentTab() {
  // Show loading toast with specific current tab processing message (Requirement 4.1)
  const loadingToast = await FeedbackManager.showCurrentTabProcessing();

  try {
    // Get current browser tab URL (Requirement 2.1, 2.2)
    const currentTabUrl = await BrowserIntegration.getCurrentTabUrl();

    if (!currentTabUrl) {
      // Check if Zen browser is active to provide specific guidance
      const isZenActive = await BrowserIntegration.isZenBrowserActive();

      // Requirement 2.4: Display error when no active browser tab detected
      const errorType = isZenActive ? "zenBrowserDetected" : "noActiveTab";
      const error = ErrorHandler.createBrowserError(errorType);
      await FeedbackManager.updateToastError(loadingToast, error);
      return;
    }

    // Initialize service client and process URL (Requirement 2.3)
    const serviceClient = new PaywallServiceClient();
    const processedUrl = await serviceClient.removePaywall(currentTabUrl);

    // Create successful result
    const result: UrlProcessingResult = {
      originalUrl: currentTabUrl,
      processedUrl: processedUrl,
      success: true,
    };

    // Show success message and open URL (Requirement 4.2, 2.3)
    await FeedbackManager.updateToastSuccess(loadingToast, result, "Current tab URL processed successfully!");
  } catch (error) {
    // Handle errors with comprehensive error categorization (Requirement 4.3, 4.4)
    const errorResponse = ErrorHandler.handleUnknownError(error);
    await FeedbackManager.updateToastError(loadingToast, errorResponse);
  }
}
