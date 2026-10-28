import type { ScreenOcrOutcome } from "../types";

export const UNEXPECTED_BRIDGE_RESULT_MESSAGE = "The text recognizer returned something unexpected";

/**
 * Reason: three different unrecognized bridge shapes all mean the same thing,
 * so the mapping from "shape we do not understand" to "this failure" lives
 * here rather than being rebuilt at each return.
 */
const UNEXPECTED_BRIDGE_RESULT_FAILURE: ScreenOcrOutcome = {
  status: "failed",
  errorMessage: UNEXPECTED_BRIDGE_RESULT_MESSAGE,
};

/** Coerces an unknown bridge field into a trimmed string, or "" if absent. */
function _trimmedStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Narrows the Raycast Swift bridge's untyped result into a `ScreenOcrOutcome`.
 *
 * Reason: `RaycastTypeScriptPlugin` generates `Promise<any>` rather than a
 * type derived from the Swift struct, so without this every caller would be
 * typing against `any`. Anything unrecognized becomes a failure rather than a
 * thrown error, because the command's job is to explain why there is no word.
 *
 * @param bridgeResult - Whatever the Swift bridge resolved with
 * @returns The outcome as a discriminated union
 */
export function narrowScreenOcrOutcome(bridgeResult: unknown): ScreenOcrOutcome {
  if (typeof bridgeResult !== "object" || bridgeResult === null) {
    return UNEXPECTED_BRIDGE_RESULT_FAILURE;
  }

  const { status, text, errorMessage } = bridgeResult as Record<string, unknown>;

  switch (status) {
    case "recognized": {
      const recognizedText = _trimmedStringOrEmpty(text);
      const hasRecognizedText = recognizedText.length > 0;
      // Reason: an empty string would put a blank query in the search bar,
      // which reads as a bug. Treat it as nothing found instead.
      return hasRecognizedText ? { status: "recognized", text: recognizedText } : { status: "noTextFound" };
    }
    case "cancelled":
    case "noTextFound":
    case "blankCapture":
      return { status };
    case "failed": {
      const bridgeErrorMessage = _trimmedStringOrEmpty(errorMessage);
      const hasUsableErrorMessage = bridgeErrorMessage.length > 0;
      return hasUsableErrorMessage
        ? { status: "failed", errorMessage: bridgeErrorMessage }
        : UNEXPECTED_BRIDGE_RESULT_FAILURE;
    }
    default:
      return UNEXPECTED_BRIDGE_RESULT_FAILURE;
  }
}
