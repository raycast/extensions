import { environment, updateCommandMetadata, LaunchType, open, showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  const recentSiteName = await rescue(() => Herd.Sites.getRecentSiteName(), "Failed to get recent site name.", "");

  if (environment.launchType === LaunchType.Background) {
    await updateCommandMetadata({ subtitle: recentSiteName });
    return;
  }

  const recentSite = await rescue(() => Herd.Sites.getRecentSite(), "Failed to get recent site.", null);

  if (!recentSite) {
    await showToast({
      title: "No recent site found.",
      style: Toast.Style.Failure,
    });
    return;
  }

  await showToast({
    title: `Opening ${recentSite.site}...`,
    style: Toast.Style.Animated,
  });

  open(recentSite.url);
}
