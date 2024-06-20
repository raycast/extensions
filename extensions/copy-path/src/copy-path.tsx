import { closeMainWindow, getFrontmostApplication, showToast, Toast } from "@raycast/api";
import { finderBundleId } from "./utils/constants";
import { copyPath, copyUrl } from "./utils/common-utils";

export default async () => {
  await closeMainWindow();
  await showToast({ title: "Copying...", style: Toast.Style.Animated });
  const frontmostApp = await getFrontmostApplication();
  if (frontmostApp.bundleId === finderBundleId) {
    // get finder path
    await copyPath();
  } else {
    // get browser web page url
    await copyUrl(frontmostApp);
  }
};
