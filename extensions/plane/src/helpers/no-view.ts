import { Clipboard, Keyboard, open, showToast, Toast } from "@raycast/api";
import { describePlaneError } from "./errors";

/** Shows a failure toast for no-view commands with the full error copyable. */
export async function showNoViewFailure(title: string, error: unknown) {
  const { message } = describePlaneError(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      shortcut: Keyboard.Shortcut.Common.Copy,
      onAction: () => Clipboard.copy(error instanceof Error ? (error.stack ?? error.message) : String(error)),
    },
  });
}

/** Success toast with "Open" and "Copy ID" actions. */
export async function showWorkItemSuccess(toast: Toast, title: string, identifier: string, url: string) {
  toast.style = Toast.Style.Success;
  toast.title = title;
  toast.message = identifier;
  toast.primaryAction = {
    title: "Open in Browser",
    shortcut: Keyboard.Shortcut.Common.Open,
    onAction: async () => {
      await open(url);
      await toast.hide();
    },
  };
  toast.secondaryAction = {
    title: "Copy ID",
    shortcut: Keyboard.Shortcut.Common.Copy,
    onAction: async () => {
      await Clipboard.copy(identifier);
      await toast.hide();
    },
  };
}
