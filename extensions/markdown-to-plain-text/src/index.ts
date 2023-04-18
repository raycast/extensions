import { Clipboard } from "@raycast/api";
import MarkdownIt from 'markdown-it';
import plainText from 'markdown-it-plain-text';


export default async function main() {
  const { text } = await Clipboard.read()
  const md = new MarkdownIt();
  md.use(plainText);
  md.render(text);
  // Here are plain text result
  const result = (md as any).plainText
  await Clipboard.paste(result);
}
