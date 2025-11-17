import { showToast, Toast } from "@raycast/api";

export function showFailureToast(title: string, message?: string) {
  showToast(Toast.Style.Failure, title, message);
}
