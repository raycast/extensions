import { closeMainWindow, getFrontmostApplication } from "@raycast/api";
import { finderBundleId } from "./utils/constants";
import {
  copyFinderPath,
  copyBrowserTabUrl,
  showLoadingHUD,
  isEmpty,
  copyUnSupportedAppContent,
} from "./utils/common-utils";

export default async () => {
  await closeMainWindow();
  await showLoadingHUD("Copying...");
  const frontmostApp = await getFrontmostApplication();
  if (frontmostApp.bundleId === finderBundleId) {
    // get finder path
    await copyFinderPath();
  } else {
    // get browser web page url
    const url = await copyBrowserTabUrl(frontmostApp);
    if (isEmpty(url)) {
      await copyUnSupportedAppContent(frontmostApp);
    }
  }
};
