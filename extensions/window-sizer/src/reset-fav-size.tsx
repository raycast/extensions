import { Toast, showToast, LocalStorage } from "@raycast/api";
import { error as logError } from "./utils/logger";

export default async function ResetSize() {
  try {
    await LocalStorage.removeItem("saved-fav-resolution");
    await showToast({
      style: Toast.Style.Success,
      title: "Fav size reset",
    });
  } catch (error) {
    logError("Error resetting fav size:", error instanceof Error ? error.message : String(error));
    await showToast({
      style: Toast.Style.Failure,
      title: "Error resetting size",
      message: "Please try again",
    });
  }
}
