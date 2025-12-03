import { Clipboard } from "@raycast/api";

/**
 * Paste text to the currently active application
 * @param text - The text to paste
 */
export async function pasteToActiveApp(text: string): Promise<void> {
  await Clipboard.paste(text);
}
