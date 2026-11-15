import { closeMainWindow, LaunchProps } from "@raycast/api";
import { LaunchContext } from "../types";
import { handleRecognitionOutcome } from "./result";
import { detectBarcode, recognizeText } from "./macos";

export async function recognizeTextCommand({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchContext }>) {
  await closeMainWindow();
  await handleRecognitionOutcome(await recognizeText(), {
    callbackOptions: launchContext?.callbackLaunchOptions,
  });
}

export async function recognizeTextFullscreenCommand() {
  await closeMainWindow();
  await handleRecognitionOutcome(await recognizeText(true));
}

export async function detectBarcodeCommand() {
  await closeMainWindow();
  await handleRecognitionOutcome(await detectBarcode(), {
    subject: "detecting barcode/QR code",
    noResultTitle: "No barcodes or QR codes detected",
    successTitle: "Copied barcode/QR code to clipboard",
    action: "copy",
  });
}
