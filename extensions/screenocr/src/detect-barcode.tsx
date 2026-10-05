import { closeMainWindow } from "@raycast/api";
import { handleRecognitionOutcome } from "./ocr/result";
import { RecognitionOutcome } from "./ocr/types";
import { detectBarcode } from "./utils";

export default async function command() {
  if (process.platform === "darwin") {
    const { detectBarcodeCommand } = await import("./ocr/macos-commands");
    return detectBarcodeCommand();
  }

  let outcome: RecognitionOutcome;
  try {
    await closeMainWindow();
    outcome = await detectBarcode();
  } catch (error) {
    outcome = {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to detect barcode/QR code",
    };
  }
  await handleRecognitionOutcome(outcome, {
    subject: "detecting barcode/QR code",
    noResultTitle: "No barcodes or QR codes detected",
    action: "copy",
  });
}
