import { showToast, Toast } from "@raycast/api";
import { openYapsWithFallback } from "./lib/yaps-app";

export default async function OpenYapsCommand() {
  try {
    await openYapsWithFallback();
  } catch (error) {
    const toast = await showToast({
      style: Toast.Style.Failure,
      title: "Couldn’t open Yaps",
      message: errorMessage(error),
    });
    toast.primaryAction = {
      title: "Try Again",
      onAction: retryOpenYapsSafely,
    };
  }
}

function retryOpenYapsSafely(): void {
  void OpenYapsCommand().catch(() => undefined);
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Try again after checking that Yaps is installed.";
}
