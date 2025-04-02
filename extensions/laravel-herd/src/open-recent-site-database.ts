import { showHUD, environment, updateCommandMetadata, LaunchType } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

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

  await rescue(() => Herd.Sites.openDatabase(recentSite), "Could not open Database for Site.");
}
