import {
  closeMainWindow,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { LaunchContext } from "../types";
import { handleRecognitionOutcome } from "./result";
import { detectBarcode, recognizeText } from "./macos";

export async function recognizeTextCommand({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { closeRaycast } = getPreferenceValues<Preferences.RecognizeText>();
  if (closeRaycast) await closeMainWindow();
  await handleRecognitionOutcome(await recognizeText(), {
    callbackOptions: launchContext?.callbackLaunchOptions,
  });
}

export async function recognizeTextFullscreenCommand() {
  const { includeRaycast } =
    getPreferenceValues<Preferences.RecognizeTextFullscreen>();
  if (!includeRaycast) await closeMainWindow();
  const outcome = await recognizeText(true);
  if (includeRaycast) await closeMainWindow();
  await handleRecognitionOutcome(outcome);
}

export async function detectBarcodeCommand() {
  const { closeRaycast } = getPreferenceValues<Preferences.DetectBarcode>();
  if (closeRaycast) await closeMainWindow();
  await handleRecognitionOutcome(await detectBarcode(), {
    subject: "detecting barcode/QR code",
    noResultTitle: "No barcodes or QR codes detected",
    successTitle: "Copied barcode/QR code to clipboard",
    action: "copy",
  });
}
