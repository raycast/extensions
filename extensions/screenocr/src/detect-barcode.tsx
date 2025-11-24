import { Clipboard, closeMainWindow } from "@raycast/api";
import { detectBarcode, showSuccessToast, showFailureToast } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const detectedCodes = await detectBarcode();

    if (
      !detectedCodes ||
      detectedCodes === "No barcodes or QR codes detected"
    ) {
      await showFailureToast("No barcodes or QR codes detected");
      return;
    }

    await Clipboard.copy(detectedCodes);
    await showSuccessToast("Copied barcode/QR code to clipboard");
  } catch (e) {
    console.error(e);
    await showFailureToast("Failed detecting barcode/QR code");
  }
}
