import { Clipboard, Keyboard } from "@raycast/api";
import type { Toast } from "@raycast/api";

const UNEXPECTED_ERROR_MESSAGE = "An unexpected error occurred.";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return UNEXPECTED_ERROR_MESSAGE;
}

export function createCopyErrorAction(message: string): Toast.ActionOptions {
  return {
    title: "Copy Error",
    shortcut: Keyboard.Shortcut.Common.Copy,
    onAction: async () => {
      await Clipboard.copy(message);
    },
  };
}
