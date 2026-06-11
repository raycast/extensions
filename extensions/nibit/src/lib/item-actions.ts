import { showToast, Toast } from "@raycast/api";

export async function runItemAction(title: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
