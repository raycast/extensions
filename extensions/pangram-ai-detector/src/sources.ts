import { Clipboard, getSelectedText } from "@raycast/api";

/** Reads the Selection; fails when nothing is selected. */
export async function readSelection(): Promise<string> {
  const text = await getSelectedText().catch(() => "");
  if (!text.trim()) throw new Error("No text selected. Select text and try again.");
  return text;
}

/** Reads the Clipboard; fails when it holds no text. */
export async function readClipboard(): Promise<string> {
  const text = (await Clipboard.readText()) ?? "";
  if (!text.trim()) throw new Error("No text on the clipboard. Copy text and try again.");
  return text;
}

/** Reads the Selection, falling back to the Clipboard. */
export function readSelectionOrClipboard(): Promise<string> {
  return readSelection().catch(() =>
    readClipboard().catch(() => {
      throw new Error("No selected or copied text. Select or copy text and try again.");
    }),
  );
}
