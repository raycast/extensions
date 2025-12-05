import { Clipboard, showHUD, getSelectedText } from "@raycast/api";

export default async function Command() {
  try {
    // Get the currently selected text
    const selectedText = await getSelectedText();

    // Convert dashes (same logic as your website)
    const DASHES = /\s*[\u2014\u2013]\s*/g;
    const fixedText = selectedText.replace(DASHES, " - ");

    // Count how many dashes were fixed
    const originalDashes = (selectedText.match(/[\u2014\u2013]/g) || []).length;

    // Paste the fixed text (this replaces selected text)
    await Clipboard.paste(fixedText);

    // Show feedback
    if (originalDashes > 0) {
      await showHUD(
        `✅ Fixed ${originalDashes} dash${originalDashes !== 1 ? "es" : ""}`,
      );
    } else {
      await showHUD("ℹ️ No dashes found");
    }
  } catch (error) {
    await showHUD("❌ Please select some text first");
  }
}
