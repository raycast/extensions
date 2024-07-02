import { closeMainWindow, getFrontmostApplication } from "@raycast/api";
import { finderBundleId } from "./utils/constants";
import { copyPath, copyUrl, showLoadingHUD } from "./utils/common-utils";

export default async () => {
  await closeMainWindow();
  await showLoadingHUD("Copying...");
  const frontmostApp = await getFrontmostApplication();
  if (frontmostApp.bundleId === finderBundleId) {
    // get finder path
    await copyPath();
  } else {
    // get browser web page url
    await copyUrl(frontmostApp);
  }
};
