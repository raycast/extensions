import {
  Clipboard,
  showHUD,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
} from "@raycast/api";
import { polishText } from "./api";

interface CommandPreferences {
  customPrompt?: string;
}

export async function runPolish(
  defaultPrompt: string,
  label: string,
  temperature = 0.3,
) {
  // Immediately close Raycast window
  await closeMainWindow();

  // Check if user has set a custom prompt for this command
  const commandPrefs = getPreferenceValues<CommandPreferences>();
  const prompt = commandPrefs.customPrompt?.trim() || defaultPrompt;

  // Try selected text first, then fall back to clipboard
  let inputText = "";
  try {
    inputText = await getSelectedText();
  } catch {
    // No selected text — fall back to clipboard
  }

  if (!inputText?.trim()) {
    const clipboardText = await Clipboard.readText();
    inputText = clipboardText || "";
  }

  if (!inputText.trim()) {
    await showHUD("❌ No text found — select text or copy it first (⌘+C)");
    return;
  }

  await showHUD(`⏳ Running ${label}...`);

  try {
    const polished = await polishText(prompt, inputText.trim(), temperature);
    await Clipboard.paste(polished);
    await showHUD(`✅ ${label}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await showHUD(`❌ Failed: ${msg.slice(0, 50)}`);
  }
}
