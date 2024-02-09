import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const removeQueryParameters = async (url: string) => {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  };

  const pasteURLWithoutQueryParameters = async () => {
    const clipboardContent = await Clipboard.readText();

    if (!clipboardContent) {
      await showHUD("No text found in clipboard.");
      return;
    }

    try {
      const modifiedUrl = await removeQueryParameters(clipboardContent);
      await Clipboard.paste(modifiedUrl);
      await showHUD(`Pasted ${modifiedUrl}!`);
    } catch (error) {
      console.error("Error formatting and pasting string as URL:", error);
      await showHUD(`Error formatting ${clipboardContent}. Is it a valid URL?`);
    }
  };

  await pasteURLWithoutQueryParameters();
}
