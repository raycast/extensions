import { Clipboard, showHUD } from "@raycast/api";
import { handlePasteToApplication } from "./preferences";
import { generateDocumentByType } from "./utils";

export default async function Command() {
  const document = generateDocumentByType("cpf");

  const pasteToApplication = handlePasteToApplication();

  Clipboard.copy(document);
  if (pasteToApplication) Clipboard.paste(document);
  await showHUD("Copied to clipboard!");
}
