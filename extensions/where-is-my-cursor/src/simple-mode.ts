import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Success,
      title: "Simple Mode Activated",
    });
    locatecursor("-p", "simple", "");
    await closeMainWindow();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to run Simple Mode",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
