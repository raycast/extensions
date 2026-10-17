import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";

export async function runViewAction(
  operation: () => Promise<void>,
  failureTitle: string,
  fallbackMessage: string,
) {
  try {
    await operation();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: error instanceof Error ? error.message : fallbackMessage,
    });
    return;
  }

  await closeMainWindow();
}

export async function runWindowCommand(
  operation: () => Promise<void>,
  successTitle: string,
  failureTitle: string,
) {
  try {
    await operation();
    await showHUD(successTitle);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: error instanceof Error ? error.message : "Try again.",
    });
  }
}
