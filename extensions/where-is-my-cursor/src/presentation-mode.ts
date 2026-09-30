import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Success,
      title: "Presentation Mode Activated",
    });
    locatecursor("-p", "presentation", "");
    await closeMainWindow();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to run Presentation Mode",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
