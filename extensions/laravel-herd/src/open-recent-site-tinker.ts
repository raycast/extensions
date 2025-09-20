import { environment, updateCommandMetadata, LaunchType, Toast, showToast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  const recentSiteName = await Herd.Sites.getRecentSiteName();

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
    title: `Opening ${recentSite.site} with tinker...`,
    style: Toast.Style.Animated,
  });

  await rescue(async () => Herd.ExternalApps.openTinker(recentSite.path), "Failed to open tinker.");
}
