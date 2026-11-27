import { Toast, showToast } from "@raycast/api";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs an action behind an animated toast, then reports success or failure.
 * Returns true when the action completed.
 */
export async function runWithToast(
  title: string,
  action: () => Promise<unknown>,
  onSuccess?: () => void,
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await action();
    toast.style = Toast.Style.Success;
    toast.title = title;
    toast.message = undefined;
    onSuccess?.();
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Any.do request failed";
    toast.message = errorMessage(error);
    return false;
  }
}
