import { buildClipboardText } from "@chrismessina/raycast-kit";

/**
 * What Copy Error copies outside a toast (an error screen's action): the same text the kit's toasts copy, including
 * the error's `cause` chain, redacted.
 */
export const clipboardText = (title: string, error: Error): string =>
  buildClipboardText({ title, errorMessage: error.message, error });
