import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";

export default async function Command() {
  try {
    // Read the current clipboard content
    const content = await Clipboard.read();

    // Ensure that there is text content to process
    if (content.text) {
      // Remove all HTML tags from the text content
      let plainText = content.text.replace(/<[^>]*>?/gm, "").trim();

      // Replace multiple newline characters with a single newline
      plainText = plainText.replace(/[\r\n]+/gm, "\n").trim();

      // Replace the clipboard content with the stripped text
      await Clipboard.copy(plainText);
      await showHUD("Removed formatting from clipboard");
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "No text content found",
        message: "Please copy some text or HTML content to the clipboard.",
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error encountered";
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: message,
    });
  }
}
