import { Toast } from "@raycast/api";
import { getInstallStatus, startFocus25 } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Starting focus",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await getInstallStatus())) {
    toast.title = "Focus is not installed";
    toast.message = "Install Focus app from: https://heyfocus.com";
    toast.style = Toast.Style.Failure;
    return;
  }

  await startFocus25();
}
