import { closeMainWindow, Toast } from "@raycast/api";
import { hideTimer, isFlowInstalled } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Hiding timer",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await isFlowInstalled())) {
    toast.title = "Flow not installed";
    toast.message = "Install it from: https://flowapp.info/download";
    toast.style = Toast.Style.Failure;
    return;
  }

  await hideTimer();
  await closeMainWindow();
}
