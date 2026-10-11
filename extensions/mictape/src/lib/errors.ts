import { open, showToast, Toast } from "@raycast/api";
import { INSTALL_URL, MictapeNotFoundError } from "./mictape";

export async function showError(title: string, error: unknown) {
  if (error instanceof MictapeNotFoundError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "mictape is not installed",
      message: "Install it, or set its path in the extension preferences.",
      primaryAction: { title: "Open Install Instructions", onAction: () => open(INSTALL_URL) },
    });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
