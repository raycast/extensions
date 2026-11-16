import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ibanPasteHudMessage } from "./saved-iban-display";
import { ibanText, loadIban } from "./storage";

export default async function main() {
  try {
    const record = await loadIban();

    if (!record) {
      await showHUD("No IBAN saved — run Generate IBAN first");
      return;
    }

    const text = ibanText(record);
    await Clipboard.paste(text);
    await showHUD(ibanPasteHudMessage(record));
  } catch (error) {
    await showFailureToast(error, { title: "Could not paste IBAN" });
  }
}
