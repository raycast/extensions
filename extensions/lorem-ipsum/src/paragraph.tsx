import { copyTextToClipboard, showHUD } from "@raycast/api";
import { generateParagraph } from "./utils";

export default async function ParagraphCommand() {
  const paragraph = generateParagraph();

  await copyTextToClipboard(paragraph);
  await showHUD("Copied to clipboard!");

  return null;
}
