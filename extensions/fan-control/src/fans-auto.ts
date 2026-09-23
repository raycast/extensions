import { Clipboard, Toast, showToast } from "@raycast/api";
import {
  DaemonNotRunningError,
  INSTALL_DAEMON_COMMAND,
  setFanProfile,
} from "./lib/smctl";

export default async function Command(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Returning fans to macOS control…",
  });
  try {
    await setFanProfile("auto");
    toast.style = Toast.Style.Success;
    toast.title = "Fans returned to macOS control";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to set fans to auto";
    toast.message = error instanceof Error ? error.message : String(error);
    if (error instanceof DaemonNotRunningError) {
      toast.primaryAction = {
        title: "Copy Install Command",
        onAction: () => Clipboard.copy(INSTALL_DAEMON_COMMAND),
      };
    }
  }
}
