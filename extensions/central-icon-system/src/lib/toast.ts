/**
 * Failure reporting with a recoverable error payload.
 *
 * Every `Toast.Style.Failure` in this extension carries a "Copy Error" action —
 * House Style, and a gap in all eleven icon extensions surveyed (see
 * docs/FINDINGS.md §4).
 */

import { Clipboard, Toast, showToast } from "@raycast/api";

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/** A toast action that puts the error text on the clipboard. */
export function copyErrorAction(message: string): Toast.ActionOptions {
  return {
    title: "Copy Error",
    onAction: async (toast) => {
      await Clipboard.copy(message);
      await toast.hide();
    },
  };
}

/** Show a failure toast carrying the error text and a Copy Error action. */
export async function reportFailure(title: string, error: unknown): Promise<void> {
  const message = errorMessage(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: copyErrorAction(message),
  });
}

/** Turn an in-flight toast into a failure, preserving the Copy Error affordance. */
export function markFailed(toast: Toast, title: string, error: unknown): void {
  const message = errorMessage(error);
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = message;
  toast.primaryAction = copyErrorAction(message);
}
