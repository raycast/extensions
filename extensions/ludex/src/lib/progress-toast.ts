import { showToast, Toast } from "@raycast/api";

/**
 * Runs `task` with its progress in an animated toast, which re-renders nothing (a list already on screen has no place for it).
 * @remarks On failure the toast is left for the caller's failure toast to replace. When `succeeded` returns false the
 * task already showed its own warning, so the success toast is skipped rather than written over it.
 */
export async function withProgressToast<T>(
  title: string,
  doneTitle: string,
  task: (progress: (msg: string) => void) => Promise<T>,
  succeeded: (result: T) => boolean = () => true,
): Promise<T> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  const result = await task((msg) => {
    toast.message = msg;
  });
  if (succeeded(result)) {
    toast.style = Toast.Style.Success;
    toast.title = doneTitle;
    toast.message = undefined;
  }
  return result;
}
