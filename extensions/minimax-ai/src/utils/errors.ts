import { showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { APIKeyError, RateLimitError, ServerError } from "../providers/minimax";

export async function handleError(error: unknown): Promise<void> {
  if (error instanceof APIKeyError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid API Key",
      message: "Please check your API key in preferences",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  if (error instanceof RateLimitError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Rate Limited",
      message: "Too many requests. Please wait a moment and try again.",
    });
    return;
  }

  if (error instanceof ServerError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Server Error",
      message: "The AI service is temporarily unavailable. Please try again.",
    });
    return;
  }

  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message,
  });
}
