import { showToast, Toast, Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { generateIBAN } from "./iban-utils";

export default async function Command() {
  try {
    const iban = generateIBAN();
    await Clipboard.copy(iban);
    await closeMainWindow();
    await showHUD("✅ Copied IBAN");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate IBAN",
      message: String(error),
    });
  }
}
