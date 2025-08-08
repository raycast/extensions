import { Clipboard, showToast, Toast, getSelectedText } from "@raycast/api";
import { compressText } from "./utils/compress";

export default async function Command() {
  try {
    // Try to get selected text first, then fallback to clipboard
    let textToCompress: string;

    try {
      textToCompress = await getSelectedText();
    } catch {
      // If no text is selected, read from clipboard
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text found",
          message: "Please select text or copy text to your clipboard first.",
        });
        return;
      }
      textToCompress = clipboardText;
    }

    if (!textToCompress.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty text",
        message: "The selected or clipboard text is empty.",
      });
      return;
    }

    // Show progress toast for large text
    const progressToast =
      textToCompress.length > 10000
        ? await showToast({
            style: Toast.Style.Animated,
            title: "Compressing...",
            message: "Processing large text, please wait.",
          })
        : null;

    // Compress the text
    let compressedText: string;
    try {
      compressedText = compressText(textToCompress);
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Compression failed",
        message: error instanceof Error ? error.message : "Failed to compress the text using Brotli.",
      });
      console.error("Compression error:", error);
      return;
    }

    // Copy the compressed text to clipboard
    await Clipboard.copy(compressedText);

    const compressionRatio = ((1 - compressedText.length / textToCompress.length) * 100).toFixed(1);
    await showToast({
      style: Toast.Style.Success,
      title: "Text compressed",
      message: `Compressed ${textToCompress.length} → ${compressedText.length} chars (${compressionRatio}% reduction) and copied to clipboard.`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
