import { Clipboard, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { outputResult } from "./utils";

export default async function Command() {
  const { preserveParagraphs } = getPreferenceValues<{ preserveParagraphs: boolean }>();

  try {
    const text = await Clipboard.readText();
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }

    let processed: string;
    if (preserveParagraphs) {
      // Replace single \n with space, preserve 2+ \n as paragraph breaks
      processed = text.replace(/\n{1,}/g, (match) => (match.length >= 2 ? "\n\n" : " "));
    } else {
      // Remove all line breaks (replace with space)
      processed = text.replace(/\n+/g, " ");
    }

    // Normalize multiple spaces into single space
    processed = processed.replace(/[ \t\r\f\v]+/g, " ").trim();

    await outputResult(processed, "Line breaks removed");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to process clipboard" });
  }
}
