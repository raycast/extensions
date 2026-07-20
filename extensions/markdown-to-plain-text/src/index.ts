import { Clipboard, showHUD } from "@raycast/api";
import MarkdownIt from "markdown-it";
import plainText from "markdown-it-plain-text";

export default async function main() {
  const { text } = await Clipboard.read();
  if (text?.length > 0) {
    const md = new MarkdownIt();
    md.use(plainText);
    md.render(text);
    // Here are plain text result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (md as any).plainText;
    await Clipboard.paste(result);
  } else {
    showHUD("❌ No text in clipboard");
  }
}
