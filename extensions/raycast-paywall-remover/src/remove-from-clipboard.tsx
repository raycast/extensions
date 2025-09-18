import { ClipboardManager } from "./utils/clipboard-manager";
import { PaywallServiceClient } from "./utils/service-client";
import { FeedbackManager } from "./utils/feedback-manager";
import { ErrorHandler } from "./utils/error-handler";
import { UrlProcessingResult } from "./types";

/**
 * Command to remove paywall from URL in clipboard
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2
 */
export default async function RemoveFromClipboard() {
  // Show loading toast with specific clipboard processing message (Requirement 4.1)
  const loadingToast = await FeedbackManager.showClipboardProcessing();

  try {
    // Extract URL from clipboard (Requirement 1.1)
    const clipboardUrl = await ClipboardManager.extractUrl();

    if (!clipboardUrl) {
      // Requirement 1.4: Display error when no valid URL found
      const error = ErrorHandler.createClipboardError("noValidUrl");
      await FeedbackManager.updateToastError(loadingToast, error);
      return;
    }

    // Initialize service client and process URL (Requirement 1.2)
    const serviceClient = new PaywallServiceClient();
    const processedUrl = await serviceClient.removePaywall(clipboardUrl);

    // Create successful result
    const result: UrlProcessingResult = {
      originalUrl: clipboardUrl,
      processedUrl: processedUrl,
      success: true,
    };

    // Show success message and open URL (Requirement 4.2, 1.3)
    await FeedbackManager.updateToastSuccess(loadingToast, result, "Clipboard URL processed successfully!");
  } catch (error) {
    // Handle errors with comprehensive error categorization (Requirement 4.3, 4.4)
    const errorResponse = ErrorHandler.handleUnknownError(error);
    await FeedbackManager.updateToastError(loadingToast, errorResponse);
  }
}
