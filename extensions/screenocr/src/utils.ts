import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast as showRaycastFailureToast } from "@raycast/utils";
import { CaptureMode, RecognitionOutcome } from "./ocr/types";

export async function recognize(
  mode: CaptureMode,
): Promise<RecognitionOutcome> {
  if (process.platform === "win32") {
    const { recognizeWindows } = await import("./ocr/windows");
    return recognizeWindows(mode);
  }
  return {
    status: "error",
    message: "Windows OCR is only available on Windows",
  };
}

export async function detectBarcode(): Promise<RecognitionOutcome> {
  return {
    status: "error",
    message:
      "Barcode and QR code detection is currently available only on macOS",
  };
}

export const showSuccessToast = async (title: string) => {
  const preference = getPreferenceValues<Preferences>();
  if (preference.showToast)
    await showToast({ style: Toast.Style.Success, title });
};

export const showFailureToast = async (
  error: unknown,
  options?: { title?: string },
) => {
  const preference = getPreferenceValues<Preferences>();
  if (preference.showToast) await showRaycastFailureToast(error, options);
};
