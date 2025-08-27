import { showToast, Toast } from "@raycast/api";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Success,
      title: "Simple Mode Activated",
    });
    await locatecursor("-p", "simple", "");
    await showToast({
      style: Toast.Style.Success,
      title: "Simple Mode Deactivated",
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to run Simple Mode",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
