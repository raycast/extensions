import { Clipboard, showHUD } from "@raycast/api";
import { cleanText, stripHtml } from "./utils";

export default async function Command() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showHUD("No text found in clipboard");
      return;
    }

    const cleanedText = await stripHtml(cleanText(text));
    await Clipboard.paste(cleanedText);
    await showHUD("Pasted clean text");
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
    } else {
      await showHUD("Failed to paste clean text");
    }
    console.error(error);
  }
}
