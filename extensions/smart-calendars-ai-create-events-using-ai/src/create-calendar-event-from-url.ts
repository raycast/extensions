import { Clipboard, showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    // Show initial toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading clipboard...",
    });

    // Get text from clipboard
    const clipboardText = await Clipboard.readText();

    // Check if we have text to process
    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No URL found in clipboard",
        message: "Copy a URL first",
      });
      return;
    }

    // Validate that it's a proper URL
    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(clipboardText.trim())) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "URL must start with http:// or https://",
      });
      return;
    }

    // Update toast
    loadingToast.title = "Processing URL...";

    // Clean the URL (remove whitespace)
    const cleanedUrl = clipboardText.trim();

    // Convert URL to base64
    const base64Url = Buffer.from(cleanedUrl).toString("base64");

    // URL encode the base64 string
    const encodedUrl = encodeURIComponent(base64Url);

    // Construct the URL with the webpage scheme
    const url = `smartcalendars://webpage/${encodedUrl}`;

    // Update toast
    loadingToast.title = "Creating calendar event from webpage...";

    // Open the URL
    await open(url);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Calendar event created",
      message: "URL sent to Smart Calendars app",
    });
  } catch (error) {
    // Show error toast
    await showFailureToast(error, { title: "Failed to create calendar event" });
  }
}
