import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    await locatecursor("off", "", "");
    await showToast({
      style: Toast.Style.Success,
      title: "Where Is My Cursor deactivated",
    });
    await closeMainWindow();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to deactivate Where Is My Cursor",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
