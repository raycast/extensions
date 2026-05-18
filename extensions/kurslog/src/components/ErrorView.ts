import { showToast, Toast } from "@raycast/api";

export async function showErrorToast(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  await showToast({ style: Toast.Style.Failure, title: "Error", message });
}
