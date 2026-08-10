import { environment, updateCommandMetadata, LaunchType, showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  const recentSiteName = await rescue(() => Herd.Sites.getRecentSiteName(), "Failed to get recent site name.", "");

  if (environment.launchType === LaunchType.Background) {
    await updateCommandMetadata({ subtitle: recentSiteName });
    return;
  }

  const recentSitePath = await rescue(() => Herd.Sites.getRecentSitePath(), "Failed to get recent site.", null);

  if (!recentSitePath) {
    await showToast({
      title: "No recent site found.",
      style: Toast.Style.Failure,
    });
    return;
  }

  await showToast({
    title: `Opening Log Viewer for ${recentSiteName}...`,
    style: Toast.Style.Animated,
  });

  await rescue(() => Herd.Sites.openLogs(recentSitePath), "Failed to open logs.", null);
}
