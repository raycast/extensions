import { buildClipboardText } from "@chrismessina/raycast-kit";

export const clipboardText = (title: string, error: Error): string =>
  buildClipboardText({ title, errorMessage: error.message, error });
