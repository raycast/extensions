import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { convertText } from "./utils/converter";

async function readInput(): Promise<{ text: string; fromSelection: boolean }> {
  try {
    const selected = await getSelectedText();
    if (selected && selected.length > 0) {
      return { text: selected, fromSelection: true };
    }
  } catch {
    // No active selection — fall through to clipboard.
  }
  const clip = await Clipboard.readText();
  return { text: clip ?? "", fromSelection: false };
}

export default async function Command() {
  try {
    const { text, fromSelection } = await readInput();

    if (text.trim().length === 0) {
      await showHUD("⚠️ No text to convert");
      return;
    }

    const { converted, direction, changed } = convertText(text);

    if (!changed) {
      await showHUD("⚠️ Nothing to convert");
      return;
    }

    // Paste replaces the selection when we read from one; otherwise it pastes
    // at the cursor, which is the natural behavior for clipboard-sourced text.
    await Clipboard.paste(converted);

    const target = direction === "th-to-en" ? "English" : "Thai";
    const source = fromSelection ? "selection" : "clipboard";
    await showHUD(`✅ Converted ${source} to ${target}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`❌ ${message}`);
  }
}
