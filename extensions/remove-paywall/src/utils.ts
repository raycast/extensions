import { Clipboard, getSelectedText } from "@raycast/api";

const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

function isUrl(text: string | undefined): boolean {
  if (!text) return false;

  return urlRegex.test(text);
}

export async function getUrl(): Promise<string | Error> {
  try {
    // If the user has selected text, use that as the URL
    const selectedText = await getSelectedText();

    // Otherwise, use the clipboard
    const clipboardText = await Clipboard.readText();

    const url = selectedText || clipboardText;
    if (!isUrl(url)) {
      return new Error(`Invalid URL: "${url}"`);
    }
  } catch (error) {
    // ignore error
  }

  return new Error("No URL provided.");
}
