import { showToast, Toast } from "@raycast/api";

export async function runAction(failureTitle: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: error instanceof Error ? error.message : "Unexpected error",
    });
  }
}
