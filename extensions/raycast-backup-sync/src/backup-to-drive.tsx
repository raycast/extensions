import {
  showToast,
  Toast,
  getPreferenceValues,
  confirmAlert,
  Alert,
  open,
} from "@raycast/api";
import { runBackup } from "./lib/backup";
import { isRaycastRunning, quitRaycast } from "./lib/system";
import { formatBytes } from "./lib/format";
import { Preferences } from "./lib/types";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing backup…",
  });

  try {
    if (prefs.warnIfRunning && (await isRaycastRunning())) {
      const choice = await confirmAlert({
        title: "Raycast is running",
        message:
          "For a fully consistent snapshot, Raycast should be quit so its databases are checkpointed. " +
          "Quit Raycast now, or back up anyway?",
        primaryAction: {
          title: "Quit & Back Up",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: { title: "Back Up Anyway" },
      });
      if (choice) {
        toast.title = "Quitting Raycast…";
        await quitRaycast();
      }
    }

    const { metadata, deletedOldBackups } = await runBackup((message) => {
      toast.title = message;
    });

    toast.style = Toast.Style.Success;
    toast.title = "Backup complete";
    toast.message =
      `${formatBytes(metadata.zipBytes)} uploaded` +
      (deletedOldBackups > 0
        ? ` · ${deletedOldBackups} old backup(s) removed`
        : "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Backup failed";
    toast.message = message;

    if (/Client ID/i.test(message)) {
      toast.primaryAction = {
        title: "Open Setup Guide",
        onAction: () =>
          open("https://console.cloud.google.com/apis/credentials"),
      };
    }
  }
}
