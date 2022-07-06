import { URL } from "url";
import { showHUD, Clipboard, open } from "@raycast/api";

import messages from "./data/messages.json";

export default async function main() {
  const clipboardText = await Clipboard.readText();
  if (clipboardText) {
    try {
      const link = new URL(clipboardText.trim());
      if (link.href.includes("www.notion.so")) {
        const appLink = link.toString().replace("https", "notion");
        await open(appLink);
      } else {
        await showHUD(messages.invalidNotionURL);
      }
    } catch (error) {
      await showHUD(messages.invalidURL);
    }
  } else {
    await showHUD(messages.emptyClipboard);
  }
}
