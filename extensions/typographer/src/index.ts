import { getSelectedText, Clipboard, showHUD } from "@raycast/api";

const Typograf = require('typograf');

export default async function main() {
  const tp = new Typograf({locale: ['ru', 'en-US']});
  const selectedText = await getSelectedText();
  const transformedText = tp.execute(selectedText);
  await Clipboard.paste(transformedText);
  await showHUD("✓");
}
