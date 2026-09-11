import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";

import { syncAgentsFromGitHub } from "./sync-agents";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Updating agents",
  });

  try {
    const result = await syncAgentsFromGitHub({ force: true });
    toast.style = Toast.Style.Success;
    toast.title = "Agents updated";
    toast.message = result.updated ? `${result.fileCount ?? 0} files synced` : "Already up to date";
    await showHUD("AI Agency agents updated");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    toast.style = Toast.Style.Failure;
    toast.title = "Update failed";
    toast.message = message;
  }
}
