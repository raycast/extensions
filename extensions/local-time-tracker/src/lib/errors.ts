import { Toast, showToast } from "@raycast/api";

export async function showFailure(title: string, error: unknown): Promise<void> {
  console.error(title, error);
  const message = error instanceof Error ? error.message : String(error);
  await showToast({ style: Toast.Style.Failure, title, message });
}
