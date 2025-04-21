import { showToast, Toast } from "@raycast/api";

export function showSuccessToast(title: string, message?: string) {
  showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

export function showFailureToast(title: string, error: unknown) {
  showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : "Unknown error",
  });
}
