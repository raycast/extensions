import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export default async function FlushLogs() {
  if (!isV6()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "This command requires Pi-hole v6",
    });
    return;
  }

  if (
    !(await confirmAlert({
      title: "Flush Query Logs",
      message: "Are you sure you want to flush all Pi-hole query logs? This cannot be undone.",
      primaryAction: {
        title: "Flush Logs",
        style: Alert.ActionStyle.Destructive,
      },
    }))
  ) {
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Flushing logs...",
  });

  try {
    const api = getPiholeAPI();
    await api.flushLogs();
    await showToast({
      style: Toast.Style.Success,
      title: "Logs flushed successfully",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to flush logs",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
