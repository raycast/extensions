import { Clipboard, showHUD } from "@raycast/api";
import { convertToMarkdown } from "./utils";

export default async function Command() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showHUD("No text found in clipboard");
      return;
    }

    const markdownText = await convertToMarkdown(text);
    await Clipboard.paste(markdownText);
    await showHUD("Pasted as Markdown");
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
    } else {
      await showHUD("Failed to paste as Markdown");
    }
    console.error(error);
  }
}
