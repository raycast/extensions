import { Toast } from "@raycast/api";

/**
 * Edits a toast object
 * @param toast Toast object
 * @param message New toast message
 * @param style New toast style
 */
export function editToast(toast: Toast, message: string, style: Toast.Style = Toast.Style.Failure): void {
  toast.message = message;
  toast.style = style;
}
