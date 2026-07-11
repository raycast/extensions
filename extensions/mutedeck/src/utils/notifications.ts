import { showToast, Toast } from "@raycast/api";
import { getPreferences } from "./api";

export async function showActionToast(
  title: string,
  style: Toast.Style = Toast.Style.Success,
  message?: string,
): Promise<void> {
  const { showToasts } = getPreferences();
  if (showToasts) {
    await showToast({
      style,
      title,
      message,
    });
  }
}

export async function showErrorToast(title: string, error?: Error): Promise<void> {
  await showActionToast(title, Toast.Style.Failure, error?.message);
}

export async function showSuccessToast(title: string, message?: string): Promise<void> {
  await showActionToast(title, Toast.Style.Success, message);
}
