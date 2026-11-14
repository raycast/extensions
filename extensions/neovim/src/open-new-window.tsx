import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { openNewWindow } from "./lib/nvim";

export default async function OpenNewWindow() {
  try {
    await closeMainWindow();
    await openNewWindow();
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Failed to open new window",
      error instanceof Error ? error.message : String(error),
    );
  }
}
