import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { randomizePreservingShape } from "./randomize";

// Time for the target app to process the simulated paste before the clipboard is restored
const PASTE_SETTLE_DELAY_MS = 300;

export default async function Command(): Promise<void> {
  const selectedText = await readSelectedText();
  if (!selectedText) {
    await showHUD("No text selected");
    return;
  }
  await pastePreservingClipboard(randomizePreservingShape(selectedText));
  await showHUD("Secret replaced");
}

async function readSelectedText(): Promise<string | undefined> {
  try {
    return await getSelectedText();
  } catch {
    return undefined;
  }
}

async function pastePreservingClipboard(text: string): Promise<void> {
  const previousClipboard = await Clipboard.read();
  await Clipboard.paste(text);
  await delay(PASTE_SETTLE_DELAY_MS);
  await Clipboard.copy(previousClipboard);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
