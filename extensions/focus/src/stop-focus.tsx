import { Toast, showToast } from "@raycast/api";
import { getInstallStatus, stopFocus } from "./utils";

export default async function () {
  if (!(await getInstallStatus())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Focus is not installed",
      message: "Install Focus app from: https://heyfocus.com",
    });
    return;
  }

  await showToast({ style: Toast.Style.Animated, title: "Stopping focus..." });
  await stopFocus();
  await showToast({ style: Toast.Style.Success, title: "Focus stopped" });
}
