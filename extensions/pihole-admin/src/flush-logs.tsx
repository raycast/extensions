import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { piHoleAPI } from "./lib/api";

export default async function FlushLogs() {
  try {
    const confirmed = await confirmAlert({
      title: "Confirm Log Flush",
      message: "Are you sure you want to delete all query logs? This action cannot be undone.",
      primaryAction: {
        title: "Yes, Flush Logs",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Flushing logs...",
      message: "Deleting all DNS query logs",
    });

    await piHoleAPI.flushLogs();

    await showToast({
      style: Toast.Style.Success,
      title: "✅ Logs Flushed",
      message: "All query logs have been successfully deleted",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Error",
      message: error instanceof Error ? error.message : "Unknown error while flushing logs",
    });
  }
}
