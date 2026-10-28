import { Clipboard, Keyboard, showToast, Toast } from "@raycast/api";
import { ATCError } from "../Hooks/useAppStoreConnect";
import { presentableApiError } from "./errors";

/** Turns anything thrown into a title/message pair, never discarding the detail. */
function describeError(error: unknown): { title: string; message: string } {
  if (error instanceof ATCError) {
    return presentableApiError(error.title, error.detail);
  }
  if (error instanceof Error) {
    return { title: "Error", message: error.message };
  }
  return { title: "Error", message: String(error) };
}

/**
 * The verbatim error, for the clipboard. The toast shows a rewritten, actionable
 * version; copying that instead would throw away the text needed to search or report.
 */
function rawErrorText(error: unknown): string {
  if (error instanceof ATCError) {
    const status = error.status === undefined ? "" : ` (HTTP ${error.status})`;
    return error.detail === error.title ? `${error.title}${status}` : `${error.title}: ${error.detail}${status}`;
  }
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

export function presentError(error: unknown) {
  const { title, message } = describeError(error);
  showToast({
    style: Toast.Style.Failure,
    title,
    message: message.length > 0 ? message : undefined,
    primaryAction: {
      title: "Copy Error",
      shortcut: Keyboard.Shortcut.Common.Copy,
      onAction: () => {
        Clipboard.copy(rawErrorText(error));
      },
    },
  });
}
