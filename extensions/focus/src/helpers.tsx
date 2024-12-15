import { Toast, showToast } from "@raycast/api";
import { getInstallStatus, isFocusRunning } from "./utils";

export async function ensureFocusIsRunning() {
  if (!(await getInstallStatus())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus is not installed",
      message: "Install Focus app from: https://heyfocus.com",
    });
    return false;
  }

  if (!(await isFocusRunning())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus app is not running",
      message: "Please start the Focus app",
    });
    return false;
  }

  return true;
}
