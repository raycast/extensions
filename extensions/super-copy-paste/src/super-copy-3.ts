import { showHUD, Clipboard, getSelectedText } from "@raycast/api";
import { getCommandRules, applyRules } from "./engine";

const COMMAND_ID = "super-copy-3";

export default async function Command() {
  let selectedText = "";
  try {
    selectedText = await getSelectedText();
  } catch {
    await showHUD("⚠️ No text selected");
    return;
  }

  if (!selectedText) {
    await showHUD("⚠️ Selected text is empty");
    return;
  }

  try {
    const rules = await getCommandRules(COMMAND_ID);
    const processedText = applyRules(selectedText, rules);

    await Clipboard.copy(processedText);

    const cleanText = processedText.replace(/\n/g, " ").trim();
    const displayText = cleanText.length > 40 ? cleanText.substring(0, 40) + "..." : cleanText;
    await showHUD(`${displayText}`);
  } catch (error) {
    console.error(error);
    await showHUD("❌ Error processing text");
  }
}
