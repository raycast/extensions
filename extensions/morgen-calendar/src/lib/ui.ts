import { showToast, Toast } from "@raycast/api";

export async function showFailure(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Morgen request failed",
    message: error instanceof Error ? error.message : String(error),
  });
}

export async function showSuccess(title: string): Promise<void> {
  await showToast({ style: Toast.Style.Success, title });
}
