import { Clipboard, Toast } from "@raycast/api";

/**
 * Turns an in-flight toast into a failure that carries Copy Error.
 *
 * Mutates the toast the operation already showed rather than hiding it and
 * raising another: two toasts in a row is a flicker, and `showFailureToast`'s
 * own default action is Report Error or Copy Logs, not Copy Error.
 */
export function failToast(toast: Toast, title: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = message;
  toast.primaryAction = {
    title: "Copy Error",
    shortcut: { macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } },
    onAction: async () => {
      await Clipboard.copy(message);
    },
  };
  toast.secondaryAction = undefined;
}
