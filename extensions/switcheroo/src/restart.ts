import { showToast, Toast } from "@raycast/api";
import { restartService } from "./lib/service";

export default async function Command() {
  try {
    const result = restartService();
    await showToast({
      style: Toast.Style.Success,
      title: result.message,
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to restart Switcheroo",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
