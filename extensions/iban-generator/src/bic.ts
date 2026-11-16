import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { loadIban } from "./storage";

export default async function main() {
  try {
    const record = await loadIban();

    if (!record) {
      await showHUD("No IBAN saved — run Generate IBAN first");
      return;
    }

    if (!record.bic) {
      await showHUD("This IBAN has no known BIC");
      return;
    }

    await Clipboard.paste(record.bic);
    await showHUD(`Pasted BIC ${record.bic}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not paste BIC" });
  }
}
