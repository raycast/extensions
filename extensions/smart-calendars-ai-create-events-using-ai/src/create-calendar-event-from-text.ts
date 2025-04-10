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
        title: "No text found in clipboard",
        message: "Copy some text first",
      });
      return;
    }

    // Update toast
    loadingToast.title = "Processing text...";

    // Clean the text (remove excessive whitespace)
    const cleanedText = clipboardText.trim();

    // Convert text to base64
    const base64Text = Buffer.from(cleanedText).toString("base64");

    // URL encode the base64 string
    const encodedText = encodeURIComponent(base64Text);

    // Construct the URL
    const url = `smartcalendars://${encodedText}`;

    // Update toast
    loadingToast.title = "Creating calendar event...";

    // Open the URL
    await open(url);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Calendar event created",
      message: "Text sent to Smart Calendars app",
    });
  } catch (error) {
    // Show error toast
    await showFailureToast(error, { title: "Failed to create calendar event" });
  }
}
