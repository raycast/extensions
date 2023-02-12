import { Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
  const clipboard = await Clipboard.readText();

  if (clipboard) {
    await Clipboard.copy(clipboard);

    const abbreviated = clipboard.length > 10 ? `${clipboard.substring(0, 10)}...` : clipboard;
    await showHUD(`Removed formatting from "${abbreviated}" and copied to clipboard`);
  } else {
    await showHUD("Clipboard is empty. Nothing to do.");
  }
}
