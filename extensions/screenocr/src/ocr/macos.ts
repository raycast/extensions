import { Clipboard, getPreferenceValues } from "@raycast/api";
import { getUserSelectedLanguages } from "../hooks";
import * as swiftBridge from "swift:../../swift";
import {
  parseClipboardChangeCount,
  parseRestoreResult,
  parseSnapshotId,
  parseSwiftResult,
} from "./swift-result";
import { RecognitionOutcome } from "./types";

const {
  clipboardChangeCount: clipboardChangeCountSwift,
  detectBarcode: detectBarcodeSwift,
  recognizeClipboard: recognizeClipboardSwift,
  recognizeText: recognizeTextSwift,
  restoreClipboard: restoreClipboardSwift,
  snapshotClipboard: snapshotClipboardSwift,
} = swiftBridge;

const PASTE_SETTLE_MS = 400;

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

export const recognizeClipboard = async (): Promise<RecognitionOutcome> => {
  const preference = getPreferenceValues<Preferences>();

  try {
    const languages = await getUserSelectedLanguages();

    const recognizedText = await recognizeClipboardSwift(
      preference.ocrMode === "fast",
      preference.languageCorrection,
      preference.ignoreLineBreaks,
      preference.customWordsList ? preference.customWordsList.split(",") : [],
      languages.map((lang) => lang.value),
    );

    return parseSwiftResult(recognizedText);
  } catch (error) {
    console.error(error);
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

    return parseSwiftResult(detectedCodes);
  } catch (error) {
    console.error(error);
    return { status: "error", message: "Failed to detect barcode" };
  }
};

// Pastes text into the frontmost app, then puts the original clipboard back.
// Nothing is pasted if the clipboard cannot be snapshotted, so the original
// contents are never lost. The snapshot is restored only while the clipboard
// still holds the paste, so a newer copy taken meanwhile is never overwritten.
export const pasteTextAndRestoreClipboard = async (text: string) => {
  const describe = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  let snapshotId: string;
  try {
    snapshotId = parseSnapshotId(await snapshotClipboardSwift());
  } catch (error) {
    throw new Error(`Could not save the clipboard: ${describe(error)}`);
  }

  let pasteError: unknown;
  try {
    await Clipboard.paste(text);
  } catch (error) {
    pasteError = error;
  }

  // Record the pasteboard version our paste produced before waiting.
  let expectedChangeCount: number | undefined;
  try {
    expectedChangeCount = parseClipboardChangeCount(
      await clipboardChangeCountSwift(),
    );
  } catch {
    expectedChangeCount = undefined;
  }

  // Give the target app time to read the pasteboard before it is restored.
  if (!pasteError) {
    await new Promise((resolve) => setTimeout(resolve, PASTE_SETTLE_MS));
  }

  // Restore even when pasting failed; this also deletes the snapshot file.
  try {
    parseRestoreResult(
      await restoreClipboardSwift(snapshotId, expectedChangeCount ?? -1),
    );
  } catch (error) {
    throw new Error(
      `Text was pasted, but the clipboard could not be restored: ${describe(error)}`,
    );
  }
  if (pasteError) throw pasteError;
};
