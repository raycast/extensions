import { showToast, Toast } from "@raycast/api";
import { locatecursor } from "swift:../swift/locatecursor";

export default async function main() {
  try {
    const result = await locatecursor("off", "", "");
    if (result === "deactivated") {
      await showToast({
        style: Toast.Style.Success,
        title: "Where Is My Cursor deactivated",
      });
    } else if (result === "not_running") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Where Is My Cursor mode active",
      });
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to deactivate Where Is My Cursor",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
