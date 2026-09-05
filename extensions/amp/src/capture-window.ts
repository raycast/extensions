import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { captureActiveWindow } from "./lib/capture";
import { showCaptureError } from "./lib/permissions";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Capturing window…",
  });

  try {
    const { capture } = await captureActiveWindow();
    toast.style = Toast.Style.Success;
    toast.title = "Window captured";
    toast.message =
      capture.context.window?.title ?? capture.context.application?.name;
    await launchCommand({ name: "new-thread", type: LaunchType.UserInitiated });
  } catch (error) {
    await toast.hide();
    await showCaptureError(error);
  }
}
