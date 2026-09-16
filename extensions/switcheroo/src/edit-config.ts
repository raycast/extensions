import { open, showToast, Toast } from "@raycast/api";
import { CONFIG_PATH } from "./lib/config";

export default async function Command() {
  try {
    await open(CONFIG_PATH);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened config in editor",
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open config",
      message: String(e),
    });
  }
}
