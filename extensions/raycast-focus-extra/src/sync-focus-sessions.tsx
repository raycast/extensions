import { environment, LaunchType, Toast, showToast } from "@raycast/api";

import { runSync } from "./sync";

export default async function Command() {
  const isBackground = environment.launchType === LaunchType.Background;

  if (isBackground) {
    await runSync();
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Syncing…",
  });
  const result = await runSync();

  if (!result.didRun) {
    toast.style = Toast.Style.Success;
    toast.title = "Already up to date";
    toast.message = "Skipped sync (recently synced).";
    return;
  }

  if ("error" in result) {
    const msg = result.error.message;
    toast.style = Toast.Style.Failure;
    toast.title = "Sync failed";
    toast.message =
      msg.includes("not permitted") || msg.includes("Full Disk Access")
        ? "Check Full Disk Access for Terminal/Raycast"
        : msg;
    return;
  }

  if (result.added === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "No new sessions";
    toast.message = "No focus sessions found since last sync.";
    return;
  }

  const skipped = result.skipped;
  const message =
    skipped > 0
      ? `Added ${result.added} session${result.added !== 1 ? "s" : ""} (${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped)`
      : `Added ${result.added} session${result.added !== 1 ? "s" : ""}`;

  toast.style = Toast.Style.Success;
  toast.title = "Synced";
  toast.message = message;
}
