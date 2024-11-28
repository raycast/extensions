import { Clipboard, getSelectedText } from "@raycast/api";

const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

function isUrl(text: string): boolean {
  return urlRegex.test(text);
}

export async function getUrl(urlArgument: string | undefined): Promise<string | Error> {
  let url: string | undefined;

  if (urlArgument) {
    // If the user has provided a URL, use that
    url = urlArgument;
  } else {
    try {
      // If the user has selected text, use that as the URL
      url = await getSelectedText();
    } catch {
      // Otherwise, use the clipboard
      url = await Clipboard.readText();
    }
  }

  if (!url) {
    return new Error("No URL provided.");
  }

  if (!isUrl(url)) {
    return new Error(`Invalid URL: "${url}"`);
  }

  return url.trim();
}
