import { RecognitionOutcome } from "./types";

// Keep these in sync with swift/Sources/ScreenOCR/ScreenOCR.swift.
const ERROR_PREFIX = "Error: ";
const CANCELLED_RESULT = "Error: cancelled";
const NO_BARCODE_RESULT = "No barcodes or QR codes detected";

export function parseSwiftResult(
  raw: string | null | undefined,
  options: { barcode?: boolean } = {},
): RecognitionOutcome {
  const value = raw ?? "";
  if (value === CANCELLED_RESULT) return { status: "cancelled" };
  if (value.startsWith(ERROR_PREFIX)) {
    return {
      status: "error",
      message: value.slice(ERROR_PREFIX.length).trim() || "Unknown error",
    };
  }
  if (!value.trim()) return { status: "no-text" };
  if (options.barcode && value === NO_BARCODE_RESULT) {
    return { status: "no-text" };
  }
  return { status: "recognized", text: value };
}
