import { Clipboard, getSelectedText } from "@raycast/api";

const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

export function isUrl(text: string | undefined): boolean {
  // If there's no text, it's not a URL
  if (!text) return false;

  return urlRegex.test(text);
}

export async function getUrl(): Promise<string | undefined> {
  // If the user has selected text, use that as the URL
  const selectedText = await getSelectedText();
  if (selectedText) return selectedText;

  // Otherwise, use the clipboard
  const clipboardText = await Clipboard.readText();
  if (clipboardText) return clipboardText;

  // If there's no URL, return undefined
  return undefined;
}
