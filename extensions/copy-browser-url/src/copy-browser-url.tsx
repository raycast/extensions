import {
  Toast,
  Clipboard,
  closeMainWindow,
  showToast,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { getBrowserUrl } from "./utils/getBrowserUrl";
import { cleanUrl } from "./utils/cleanUrl";

interface Preferences {
  enableSanitization: boolean;
}

export default async function CopyBrowserUrl() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const { enableSanitization } = preferences;

    // Show loading toast immediately for user feedback
    await showToast({
      title: "Getting browser URL...",
      style: Toast.Style.Animated,
    });

    // Close window after showing toast
    await closeMainWindow();

    // Get browser URL (this is the slowest operation)
    const { data: url, error } = await getBrowserUrl();

    if (error) {
      await showToast({
        title: "Error getting browser URL",
        message: error.message,
        style: Toast.Style.Failure,
      });
      return;
    }

    if (!url) {
      await showToast({
        title: "No URL found",
        message: "No active browser tab detected",
        style: Toast.Style.Failure,
      });
      return;
    }

    // Process URL (sanitization is very fast)
    const finalUrl = enableSanitization ? cleanUrl(url) : url;

    // Copy to clipboard (very fast)
    await Clipboard.copy(finalUrl);

    // Show success message (fast)
    const successMessage = enableSanitization
      ? "✅ Clean URL copied to clipboard"
      : "✅ URL copied to clipboard";
    await showHUD(successMessage);
  } catch (error) {
    await showToast({
      title: "Failed to copy URL",
      message: error instanceof Error ? error.message : "Unknown error",
      style: Toast.Style.Failure,
    });
  }
}
