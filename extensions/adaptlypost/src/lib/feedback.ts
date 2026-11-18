import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { ApiError } from "./http";

type ToastCopy<T> = {
  pending: string;
  success: string;
  failure: string;
  successMessage?: (result: T) => string;
};

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const preferencesAction = (error: unknown): Toast.ActionOptions | undefined =>
  error instanceof ApiError && error.status === 401
    ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
    : undefined;

export async function showApiError(title: string, error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: errorText(error),
    primaryAction: preferencesAction(error),
  });
}

export async function runWithToast<T>(copy: ToastCopy<T>, action: () => Promise<T>): Promise<T | undefined> {
  const toast = await showToast({ style: Toast.Style.Animated, title: copy.pending });
  try {
    const result = await action();
    toast.style = Toast.Style.Success;
    toast.title = copy.success;
    toast.message = copy.successMessage?.(result);
    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = copy.failure;
    toast.message = errorText(error);
    toast.primaryAction = preferencesAction(error);
    return undefined;
  }
}
