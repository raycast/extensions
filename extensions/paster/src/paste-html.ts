import { Clipboard, showHUD } from "@raycast/api";
import { convertToHtml } from "./utils";

export default async function Command() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showHUD("No text found in clipboard");
      return;
    }

    const htmlText = await convertToHtml(text);
    await Clipboard.paste(htmlText);
    await showHUD("Pasted as HTML");
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
    } else {
      await showHUD("Failed to paste as HTML");
    }
    console.error(error);
  }
}
