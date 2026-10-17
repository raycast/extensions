import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Success,
      title: "Simple Mode Activated",
    });
    void locatecursor("-p", "simple", "").catch((error) =>
      showFailureToast(error, { title: "Failed to run Simple Mode" }),
    );
    await closeMainWindow();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to run Simple Mode",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
