import { Toast, showToast } from "@raycast/api";
import { getCommandErrorMessage } from "./error";

export async function showRunningToast(title: string, message?: string) {
  return showToast({
    style: Toast.Style.Animated,
    title,
    message,
  });
}

export function showSuccessToast(
  toast: Toast,
  title: string,
  message?: string,
) {
  toast.style = Toast.Style.Success;
  toast.title = title;
  toast.message = message;
}

export function showFailureToast(
  toast: Toast,
  title: string,
  error: unknown,
  fallback?: string,
) {
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = getCommandErrorMessage(error, fallback ?? "Action failed.");
}
