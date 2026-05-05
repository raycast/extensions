import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";

import { killProcess } from "./runtime";

export async function confirmAndKillProcess(
  pid: number,
  port: number,
  onComplete?: () => Promise<void> | void,
): Promise<void> {
  const confirmed = await confirmAlert({
    title: `Stop process on port ${port}?`,
    message: `This sends SIGTERM to PID ${pid}.`,
    primaryAction: {
      title: "Stop Process",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  try {
    killProcess(pid);
    await showToast({
      style: Toast.Style.Success,
      title: `Stopped port ${port}`,
      message: `PID ${pid}`,
    });
    await onComplete?.();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Unable to stop port ${port}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
