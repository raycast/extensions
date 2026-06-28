import { Clipboard, getFrontmostApplication, showHUD } from "@raycast/api";

export default async function Command() {
  const frontmostApplication = await getFrontmostApplication();
  if (frontmostApplication.bundleId) {
    await Clipboard.copy(frontmostApplication.bundleId);
    await showHUD(`Copied bundle id ${frontmostApplication.bundleId}`);
  } else {
    await showHUD("Can't copy current app's bundle id");
  }
}
