import { Clipboard, showHUD } from "@raycast/api";
import { generateDocumentByType } from "./utils";

export default async function Command() {
  const document = generateDocumentByType("cnpj");

  Clipboard.copy(document);
  await showHUD("Copied to clipboard!");
}
