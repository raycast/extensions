import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { outputResult } from "./utils";

function trimParagraphs(text: string) {
  // Split text into paragraphs by newline
  const paragraphs = text.split("\n");
  // Trim leading and trailing whitespace on each paragraph
  const trimmed = paragraphs.map((p) => p.trim());
  // Join paragraphs back preserving newlines
  return trimmed.join("\n");
}

export default async function Command() {
  try {
    const text = await Clipboard.readText();
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }

    const processed = trimParagraphs(text);

    await outputResult(processed, "Trimmed leading & trailing whitespace per paragraph");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to trim whitespace" });
  }
}
