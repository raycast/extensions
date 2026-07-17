import { Toast, showToast } from "@raycast/api";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function showErrorToast(error: Error | undefined) {
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}
