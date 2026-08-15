import { environment, LaunchType, showToast, Toast } from "@raycast/api";
import { syncFromLokalise, needsInitialSync } from "./api/sync-service";

export default async function Command() {
  const isBackground = environment.launchType === LaunchType.Background;

  if (!isBackground) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Syncing translations...",
    });
  }

  try {
    const needsSync = await needsInitialSync();

    if (needsSync) {
      return;
    }

    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing translations...",
    });

    const result = await syncFromLokalise(async (current) => {
      progressToast.message = `~${current} keys synced`;
    });

    if (result.success) {
      progressToast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Sync Complete",
        message: `${result.keysCount} keys synced`,
      });
    } else {
      progressToast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync Failed",
        message: result.error?.message || "Unknown error",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sync Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
