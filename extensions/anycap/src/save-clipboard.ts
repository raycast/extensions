import { Clipboard, showHUD } from "@raycast/api";
import { asURL, save } from "./anycap";

/// A link on the clipboard is saved as a link, anything else as a note.
export default async function main() {
  const text = (await Clipboard.readText())?.trim();
  if (!text) {
    await showHUD("Nothing on the clipboard");
    return;
  }
  try {
    const url = asURL(text);
    await showHUD(await save(url ? { url } : { text }));
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
