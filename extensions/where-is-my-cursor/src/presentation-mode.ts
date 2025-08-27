import { showToast, Toast } from "@raycast/api";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Success,
      title: "Presentation Mode Activated",
    });
    await locatecursor("-p", "presentation", "");
    await showToast({
      style: Toast.Style.Success,
      title: "Presentation Mode Deactivated",
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to run Presentation Mode",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
