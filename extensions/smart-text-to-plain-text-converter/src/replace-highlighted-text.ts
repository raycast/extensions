import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { convertSmartText } from "./helpers/convert-smart-text";

/**
 * Command to replace highlighted text with converted plain text.
 */
export default async function replaceHighlightedText() {
  try {
    const selectedText = await getSelectedText();
    const convertedText = convertSmartText(selectedText);
    await Clipboard.paste(convertedText);
    await showHUD("✅ Highlighted text replaced with plain text!");
  } catch (error) {
    await showHUD("❌ Error: Unable to replace highlighted text.");
  }
}
