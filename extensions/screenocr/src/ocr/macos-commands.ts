import {
  closeMainWindow,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { LaunchContext } from "../types";
import { showFailureToast } from "../utils";
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
  let closeFailed = false;
  let closeError: unknown;
  if (includeRaycast) {
    try {
      await closeMainWindow();
    } catch (error) {
      closeFailed = true;
      closeError = error;
    }
  }
  await handleRecognitionOutcome(outcome);
  if (closeFailed) {
    await showFailureToast(closeError, { title: "Could not close Raycast" });
  }
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
