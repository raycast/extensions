import { URL } from "url";
import { showHUD, Clipboard, open } from "@raycast/api";

import messages from "./data/messages.json";

export default async function main() {
  const clipboardText = await Clipboard.readText();
  if (clipboardText) {
    try {
      const url = new URL(clipboardText.trim());
      if (url.href.includes("youtube.com/watch")) {
        url.searchParams.delete("list");
        url.searchParams.delete("index");
        await open(url.toString());
      } else {
        await showHUD(messages.invalidYouTubeURL);
      }
    } catch (error) {
      console.error(error);
      await showHUD(messages.invalidURL);
    }
  } else {
    await showHUD(messages.emptyClipboard);
  }
}
