import { Clipboard, showHUD } from "@raycast/api";
import { getLastSnippet } from "./lib/last-used";

export default async function Command() {
  const last = await getLastSnippet();
  if (!last) {
    await showHUD("No recent snippet — use Search Snippets first");
    return;
  }
  await Clipboard.paste(last.content);
  await showHUD(`Pasted: ${last.title}`);
}
