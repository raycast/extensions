import { Clipboard } from "@raycast/api";
import { pasteText } from "./paste-text";

export default async function PasteClipboard() {
  await pasteText(() => Clipboard.readText(), "Clipboard is empty", "Copy some text first.");
}
