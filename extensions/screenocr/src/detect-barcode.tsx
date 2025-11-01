import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { detectBarcode } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const detectedCodes = await detectBarcode();

    if (
      !detectedCodes ||
      detectedCodes === "No barcodes or QR codes detected"
    ) {
      return await showToast({
        style: Toast.Style.Failure,
        title: "No barcodes or QR codes detected",
      });
    }

    await Clipboard.copy(detectedCodes);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied barcode/QR code to clipboard",
    });
  } catch (e) {
    console.error(e);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed detecting barcode/QR code",
    });
  }
}
