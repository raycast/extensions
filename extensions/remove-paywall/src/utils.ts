import { Clipboard, getSelectedText } from "@raycast/api";

export function isUrl(text: string): boolean {
  return /^https?:\/\//.test(text);
}

export async function getExistingText(fallbackText = ""): Promise<string> {
  let selectedText = "";
  let clipboardText: string | undefined = "";
  fallbackText = fallbackText?.trim() ?? "";

  // Get the selected text (if any)
  try {
    selectedText = (await getSelectedText()).trim();
  } catch {
    // Ignore errors
  }

  // Get the clipboard text (if any)
  try {
    clipboardText = await Clipboard.readText();
    clipboardText = clipboardText ? clipboardText.trim() : "";
  } catch {
    // Ignore errors
  }

  return [selectedText, fallbackText, clipboardText].find((v) => !!v) ?? "";
}
