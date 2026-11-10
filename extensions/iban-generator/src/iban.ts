import { Clipboard, showHUD } from "@raycast/api";
import { ibanPasteHudMessage } from "./saved-iban-display";
import { ibanText, loadIban } from "./storage";

export default async function main() {
  const record = await loadIban();

  if (!record) {
    await showHUD("No IBAN saved — run Generate IBAN first");
    return;
  }

  const text = ibanText(record);
  await Clipboard.paste(text);
  await showHUD(ibanPasteHudMessage(record));
}
