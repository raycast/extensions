import { showToast, Toast } from "@raycast/api";

/**
 * Runs `task` with its progress in an animated toast, which re-renders nothing (a list already on screen has no place for it).
 * @remarks On failure the toast is left for the caller's failure toast to replace.
 */
export async function withProgressToast<T>(
  title: string,
  doneTitle: string,
  task: (progress: (msg: string) => void) => Promise<T>,
): Promise<T> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  const result = await task((msg) => {
    toast.message = msg;
  });
  toast.style = Toast.Style.Success;
  toast.title = doneTitle;
  toast.message = undefined;
  return result;
}
