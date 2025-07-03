import { Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    // Get text from clipboard
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text in clipboard",
        message: "Please copy some JSON content to clipboard first",
      });
      return;
    }

    try {
      // Parse and format JSON
      const parsed = JSON.parse(clipboardText);
      const formattedJson = JSON.stringify(parsed, null, 2);

      // Copy formatted JSON back to clipboard
      await Clipboard.copy(formattedJson);

      await showToast({
        style: Toast.Style.Success,
        title: "JSON Formatted",
        message: "Formatted JSON copied to clipboard",
      });
    } catch (parseError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message: "The clipboard content is not valid JSON",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to format JSON",
    });
  }
}
