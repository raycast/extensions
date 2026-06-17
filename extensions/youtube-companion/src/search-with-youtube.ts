import { showHUD, Clipboard, open } from "@raycast/api";

import messages from "./data/messages.json";

export default async function main() {
  const clipboardText = await Clipboard.readText();
  if (clipboardText) {
    open(`https://www.youtube.com/results?search_query=${encodeURI(clipboardText.trim())}`);
  } else {
    await showHUD(messages.emptyClipboard);
  }
}
