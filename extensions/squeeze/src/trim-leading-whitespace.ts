import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { outputResult } from "./utils";

function trimLeadingWhitespacePerParagraph(text: string) {
  const paragraphs = text.split("\n");
  const trimmed = paragraphs.map((p) => p.trimStart());
  return trimmed.join("\n");
}

export default async function Command() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      return;
    }

    const trimmed = trimLeadingWhitespacePerParagraph(text);

    await outputResult(trimmed, "Leading whitespace trimmed from clipboard");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to trim leading whitespace" });
  }
}
