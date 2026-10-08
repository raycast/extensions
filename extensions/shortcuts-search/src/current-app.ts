import { Clipboard, getFrontmostApplication, showHUD } from "@raycast/api";
import { getPlatform } from "./load/platform";
import { windowsProcessName } from "./app-matching";

export default async function Command() {
  const frontmostApplication = await getFrontmostApplication();
  const platform = getPlatform();
  const appId = platform === "windows" ? frontmostApplication.windowsAppId : frontmostApplication.bundleId;
  const processName = platform === "windows" ? windowsProcessName(frontmostApplication) : undefined;

  if (appId) {
    await Clipboard.copy(appId);
    await showHUD(`Copied ${platform === "windows" ? "windows app id" : "bundle id"} ${appId}`);
  } else if (processName) {
    await Clipboard.copy(processName);
    await showHUD(`Copied Windows process name "${processName}" (no Windows app ID available)`);
  } else {
    await showHUD(`Can't copy current app's ${platform === "windows" ? "windows app id" : "bundle id"}`);
  }
}
