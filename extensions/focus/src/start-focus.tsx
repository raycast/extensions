import { Toast, open } from "@raycast/api";
import { getInstallStatus, startFocus } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Starting focus",
    style: Toast.Style.Animated,
  });

  await toast.show();

  if (!(await getInstallStatus())) {
    toast.title = "Focus is not installed";
    toast.message = "Install Focus app from: https://heyfocus.com";
    toast.style = Toast.Style.Failure;
    await toast.show();
    return;
  }

  await startFocus();
}
