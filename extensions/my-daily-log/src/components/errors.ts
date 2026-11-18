import { showToast, Toast } from "@raycast/api";

export async function showErrorToast(title: string, error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
