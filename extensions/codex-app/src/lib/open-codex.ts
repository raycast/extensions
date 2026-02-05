import { open, showToast, Toast } from "@raycast/api";

export async function openCodexDeepLink(url: string, label: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to open ${label}`,
      message,
    });
  }
}
