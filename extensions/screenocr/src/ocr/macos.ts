import { Clipboard, getPreferenceValues } from "@raycast/api";
import { getUserSelectedLanguages } from "../hooks";
import * as swiftBridge from "swift:../../swift";
import { parseSwiftResult } from "./swift-result";
import { RecognitionOutcome } from "./types";

const {
  detectBarcode: detectBarcodeSwift,
  recognizeClipboard: recognizeClipboardSwift,
  recognizeText: recognizeTextSwift,
  restoreClipboard: restoreClipboardSwift,
  snapshotClipboard: snapshotClipboardSwift,
} = swiftBridge;

const PASTE_SETTLE_MS = 400;

// A cold first run loads the Vision model slowly, so fail fast instead of spinning.
export const OCR_TIMEOUT_MS = 5000;

class OcrTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Recognition timed out after ${Math.round(timeoutMs / 1000)}s`);
    this.name = "OcrTimeoutError";
  }
}

async function withOcrTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new OcrTimeoutError(timeoutMs)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const recognizeText = async (
  isFullScreen = false,
): Promise<RecognitionOutcome> => {
  const preference = getPreferenceValues<Preferences>();

  try {
    const languages = await getUserSelectedLanguages();

    const recognizedText = await recognizeTextSwift(
      isFullScreen,
      preference.keepImage,
      preference.ocrMode === "fast",
      preference.languageCorrection,
      preference.ignoreLineBreaks,
      preference.customWordsList ? preference.customWordsList.split(",") : [],
      languages.map((lang) => lang.value),
      Boolean(preference.playSound),
    );

    return parseSwiftResult(recognizedText);
  } catch (error) {
    console.error(error);
    return { status: "error", message: "Failed to recognize text" };
  }
};

export const recognizeClipboard = async (
  timeoutMs: number = OCR_TIMEOUT_MS,
): Promise<RecognitionOutcome> => {
  const preference = getPreferenceValues<Preferences>();

  try {
    const languages = await getUserSelectedLanguages();

    const recognizedText = await withOcrTimeout(
      recognizeClipboardSwift(
        preference.ocrMode === "fast",
        preference.languageCorrection,
        preference.ignoreLineBreaks,
        preference.customWordsList ? preference.customWordsList.split(",") : [],
        languages.map((lang) => lang.value),
      ),
      timeoutMs,
    );

    return parseSwiftResult(recognizedText);
  } catch (error) {
    console.error(error);
    if (error instanceof OcrTimeoutError) {
      return {
        status: "error",
        message: `${error.message}. The first run can be slower while the OCR model loads — try again.`,
      };
    }
    return {
      status: "error",
      message: "Failed to recognize clipboard image",
    };
  }
};

export const detectBarcode = async (): Promise<RecognitionOutcome> => {
  const preference = getPreferenceValues<Preferences>();

  try {
    const detectedCodes = await detectBarcodeSwift(
      preference.keepImage,
      Boolean(preference.playSound),
    );

    return parseSwiftResult(detectedCodes, { barcode: true });
  } catch (error) {
    console.error(error);
    return { status: "error", message: "Failed to detect barcode" };
  }
};

// Pastes text into the frontmost app, then puts the original clipboard back.
// Nothing is pasted if the clipboard cannot be snapshotted, so the original
// contents are never lost.
export const pasteTextAndRestoreClipboard = async (text: string) => {
  const snapshotId = await snapshotClipboardSwift();
  if (snapshotId.startsWith("Error: ")) {
    throw new Error(
      `Could not save the clipboard: ${snapshotId.slice("Error: ".length)}`,
    );
  }

  let pasteError: unknown;
  try {
    await Clipboard.paste(text);
    // Give the target app time to read the pasteboard before it is restored.
    await new Promise((resolve) => setTimeout(resolve, PASTE_SETTLE_MS));
  } catch (error) {
    pasteError = error;
  }

  // Restore even when pasting failed; this also deletes the snapshot file.
  const restored = await restoreClipboardSwift(snapshotId);
  if (restored.startsWith("Error: ")) {
    throw new Error(
      `Text was pasted, but the clipboard could not be restored: ${restored.slice("Error: ".length)}`,
    );
  }
  if (pasteError) throw pasteError;
};
