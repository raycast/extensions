import { showToast, Toast } from "@raycast/api";

/**
 * Show an animated toast while `work` runs, then morph it into a green
 * success toast or a red failure toast. Toasts stay visible as a floating
 * pill even when the Raycast window is closed.
 */
export async function runWithToast(
  workingTitle: string,
  work: () => Promise<{ title: string; message?: string }>,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: workingTitle,
  });
  try {
    const result = await work();
    toast.style = Toast.Style.Success;
    toast.title = result.title;
    toast.message = result.message;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

/** Show a red failure toast without running any work. */
export async function showFailure(
  title: string,
  message?: string,
): Promise<void> {
  await showToast({ style: Toast.Style.Failure, title, message });
}
