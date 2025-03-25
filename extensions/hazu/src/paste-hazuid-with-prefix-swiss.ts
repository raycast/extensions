import { Clipboard } from "@raycast/api";

export default async function pasteClipboard() {
  // Read the current clipboard content
  const clipboardContent = await Clipboard.readText();

  if (clipboardContent) {
    // check if the clipboard content starts with the prefix
    const prefix = "hazu.swiss/";
    let newString = clipboardContent;

    if (!clipboardContent.startsWith(prefix)) {
      // if the clipboard content does not start with the prefix, add it
      newString = prefix + clipboardContent;
    }

    // Paste the new string
    await Clipboard.paste(newString);
  }
}
