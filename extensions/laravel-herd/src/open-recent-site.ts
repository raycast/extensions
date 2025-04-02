import { showHUD, environment, updateCommandMetadata, LaunchType, open } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  const recentSiteName = await rescue(() => Herd.Sites.getRecentSiteName(), "Failed to get recent site name.", "");

  if (environment.launchType === LaunchType.Background) {
    await updateCommandMetadata({ subtitle: recentSiteName });
    return;
  }

  const recentSite = await rescue(() => Herd.Sites.getRecentSite(), "Failed to get recent site.", "");

  if (!recentSite) {
    await showHUD("No recent site found");
    return;
  }

  await showHUD(`Opening ${recentSite.site}...`);
  open(recentSite.url);
}
