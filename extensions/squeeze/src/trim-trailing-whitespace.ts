import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

function trimTrailingWhitespacePerParagraph(text: string) {
  const paragraphs = text.split("\n");
  const trimmed = paragraphs.map((p) => p.trimEnd());
  return trimmed.join("\n");
}

export default async function Command() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      return;
    }

    const trimmed = trimTrailingWhitespacePerParagraph(text);

    await Clipboard.copy(trimmed);

    await showToast({
      style: Toast.Style.Success,
      title: "Trailing whitespace trimmed from clipboard",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to trim trailing whitespace" });
  }
}
