import { showHUD, environment, updateCommandMetadata, LaunchType, open } from "@raycast/api";
import { Herd } from "./utils/Herd";

export default async function main() {
  const recentSiteName = await Herd.Sites.getRecentSiteName();

  if (environment.launchType === LaunchType.Background) {
    await updateCommandMetadata({ subtitle: recentSiteName });
    return;
  }

  const recentSite = await Herd.Sites.getRecentSite();

  if (!recentSite) {
    await showHUD("No recent site found");
    return;
  }

  await showHUD(`Opening ${recentSite.site}...`);
  open(recentSite.url);
}
