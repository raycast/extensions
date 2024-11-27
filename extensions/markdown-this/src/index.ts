import { showHUD, Clipboard } from "@raycast/api";
import MarkdownIt from "markdown-it";

export default async function main() {
  const md = new MarkdownIt();
  const text = await Clipboard.readText();
  await Clipboard.copy(md.render(text || ""));
  await showHUD("Text in the clipboard is now HTML");
}
