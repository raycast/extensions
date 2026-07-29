import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { isMeaningfulSelection, quoteText, resolveSelectionAfterCopy, toRestorableContent } from "./quote";

const COPY_DELAY_MS = 150;
const PASTE_DELAY_MS = 200;

async function readSelectionViaCopy(originalClipboard: string): Promise<string | null> {
  await runAppleScript(`tell application "System Events" to keystroke "c" using command down`);
  await new Promise((resolve) => setTimeout(resolve, COPY_DELAY_MS));
  const after = (await Clipboard.read()).text;
  return resolveSelectionAfterCopy(originalClipboard, after);
}

export default async function main() {
  const originalClipboard = await Clipboard.read();

  let selection: string | null = null;

  try {
    const accessibilitySelection = await getSelectedText();
    if (accessibilitySelection && isMeaningfulSelection(accessibilitySelection)) {
      selection = accessibilitySelection;
    }
  } catch {
    // Accessibility path failed (terminal may not expose AX selection) — fall through to keystroke fallback.
  }

  if (!selection) {
    selection = await readSelectionViaCopy(originalClipboard.text);
  }

  if (!selection || !isMeaningfulSelection(selection)) {
    await showHUD("No text selected");
    return;
  }

  await Clipboard.paste(quoteText(selection));

  await new Promise((resolve) => setTimeout(resolve, PASTE_DELAY_MS));
  await Clipboard.copy(toRestorableContent(originalClipboard));
  await showHUD("Quoted");
}
