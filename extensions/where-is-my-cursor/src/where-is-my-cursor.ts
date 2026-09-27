import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    void locatecursor("", "", "").catch((error) =>
      showFailureToast(error, { title: "Failed to run Default Mode" }),
    );
    await closeMainWindow();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to run Default Mode",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
