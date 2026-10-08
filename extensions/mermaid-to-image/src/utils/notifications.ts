import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function showAnimatedStatusToast(title: string, message?: string) {
  return await showToast({
    style: Toast.Style.Animated,
    title,
    message,
  });
}

export async function showSuccessToast(title: string, message?: string) {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

export async function showActionFailureToast(error: unknown, title: string, message?: string) {
  await showFailureToast(error, {
    title,
    message: message ?? (error instanceof Error ? error.message : String(error)),
  });
}
