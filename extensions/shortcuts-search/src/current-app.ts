import { Clipboard, getFrontmostApplication, showHUD } from "@raycast/api";
import { getPlatform } from "./load/platform";

export default async function Command() {
  const frontmostApplication = await getFrontmostApplication();
  const platform = getPlatform();
  const appId = platform === "windows" ? frontmostApplication.windowsAppId : frontmostApplication.bundleId;

  if (appId) {
    await Clipboard.copy(appId);
    await showHUD(`Copied ${platform === "windows" ? "windows app id" : "bundle id"} ${appId}`);
  } else if (platform === "windows" && frontmostApplication.name) {
    await Clipboard.copy(frontmostApplication.name);
    await showHUD(`Copied app name "${frontmostApplication.name}" (no windows app id available)`);
  } else {
    await showHUD(`Can't copy current app's ${platform === "windows" ? "windows app id" : "bundle id"}`);
  }
}
