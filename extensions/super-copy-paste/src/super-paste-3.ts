import { showHUD, Clipboard } from "@raycast/api";
import { getCommandRules, applyRules } from "./engine";

const COMMAND_ID = "super-paste-3";

export default async function Command() {
  let clipboardText = "";
  try {
    clipboardText = (await Clipboard.readText()) || "";
  } catch {
    await showHUD("⚠️ Unable to read clipboard");
    return;
  }

  if (!clipboardText) {
    await showHUD("⚠️ Clipboard is empty or not text");
    return;
  }

  try {
    const rules = await getCommandRules(COMMAND_ID);
    const processedText = applyRules(clipboardText, rules);

    await Clipboard.paste(processedText);
  } catch (error) {
    console.error(error);
    await showHUD("❌ Error pasting text");
  }
}
