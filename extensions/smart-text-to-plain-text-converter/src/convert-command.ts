import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { convertSmartText } from "./helpers/convert-smart-text";

/**
 * Command to convert smart text and copy the result to the clipboard.
 */
export default async function convertCommand() {
  try {
    const selectedText = await getSelectedText();
    const convertedText = convertSmartText(selectedText);
    await Clipboard.copy(convertedText);
    await showHUD("✅ Plain text copied to clipboard!");
  } catch (error) {
    await showHUD("❌ Error: Unable to convert text.");
  }
}
