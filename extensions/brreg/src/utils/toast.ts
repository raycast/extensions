import { showToast, Toast } from "@raycast/api";

export function showFailureToast(title: string, message?: string): void {
  showToast({ style: Toast.Style.Failure, title, message });
}
