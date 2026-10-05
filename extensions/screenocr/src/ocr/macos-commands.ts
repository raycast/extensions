import { Clipboard, closeMainWindow, LaunchProps } from "@raycast/api";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { OCRResult, LaunchContext } from "../types";
import { showFailureToast, showSuccessToast } from "../utils";
import { detectBarcode, recognizeText } from "./macos";

export async function recognizeTextCommand({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchContext }>) {
  await closeMainWindow();

  const callbackOptions = launchContext?.callbackLaunchOptions;

  try {
    const recognizedText = await recognizeText();

    if (!recognizedText) {
      await showFailureToast("No text detected", { title: "No text detected" });

      if (callbackOptions) {
        await callbackLaunchCommand(callbackOptions, {
          text: null,
          error: "No text detected",
        } satisfies OCRResult);
      }

      return;
    }

    if (callbackOptions) {
      await callbackLaunchCommand(callbackOptions, {
        text: recognizedText,
      } satisfies OCRResult);
      return;
    }

    await Clipboard.copy(recognizedText);
    await showSuccessToast("Copied text to clipboard");
  } catch (e) {
    console.error(e);
    await showFailureToast(e, { title: "Failed detecting text" });

    if (callbackOptions) {
      await callbackLaunchCommand(callbackOptions, {
        text: null,
        error: e instanceof Error ? e.message : "Failed detecting text",
      } satisfies OCRResult);
    }
  }
}

export async function recognizeTextFullscreenCommand() {
  await closeMainWindow();

  try {
    const recognizedText = await recognizeText(true);

    if (!recognizedText) {
      await showFailureToast("No text detected", { title: "No text detected" });
      return;
    }

    await Clipboard.copy(recognizedText);
    await showSuccessToast("Copied text to clipboard");
  } catch (e) {
    console.error(e);
    await showFailureToast(e, { title: "Failed detecting text" });
  }
}

export async function detectBarcodeCommand() {
  await closeMainWindow();

  try {
    const detectedCodes = await detectBarcode();

    if (
      !detectedCodes ||
      detectedCodes === "No barcodes or QR codes detected"
    ) {
      await showFailureToast("No barcodes or QR codes detected", {
        title: "No barcodes or QR codes detected",
      });
      return;
    }

    await Clipboard.copy(detectedCodes);
    await showSuccessToast("Copied barcode/QR code to clipboard");
  } catch (e) {
    console.error(e);
    await showFailureToast(e, { title: "Failed detecting barcode/QR code" });
  }
}
