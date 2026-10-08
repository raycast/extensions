import { Clipboard, getSelectedText } from "@raycast/api";

export default async function Swap() {
  try {
    const selectedText = await getSelectedText();
    const clipboardContent = await Clipboard.readText();

    if (selectedText) {
      await Clipboard.copy(selectedText);
    }

    if (clipboardContent) {
      await Clipboard.paste(clipboardContent);
    }
  } catch {
    // Noop when anything fails to match typical copy/paste behaviour
  }
}
