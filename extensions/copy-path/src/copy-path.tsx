import { closeMainWindow, getFrontmostApplication } from "@raycast/api";
import { finderBundleId, qSpaceBundleId, spotifyBundleId } from "./utils/constants";
import {
  copyFinderPath,
  copyBrowserTabUrl,
  showLoadingHUD,
  isEmpty,
  copyUnSupportedAppContent,
  copyWindowPath,
  copyQSpacePath,
  copySpotifyUrl,
} from "./utils/common-utils";

export default async () => {
  await closeMainWindow();
  await showLoadingHUD("Copying...");
  const frontmostApp = await getFrontmostApplication();
  if (frontmostApp.bundleId === finderBundleId) {
    // get finder path
    await copyFinderPath();
  } else if (frontmostApp.bundleId === qSpaceBundleId) {
    await copyQSpacePath();
  } else if (frontmostApp.bundleId === spotifyBundleId) {
    await copySpotifyUrl();
  } else {
    const windowPath = await copyWindowPath(frontmostApp);
    if (!isEmpty(windowPath)) {
      return;
    }

    // get browser web page url
    const url = await copyBrowserTabUrl(frontmostApp);
    if (isEmpty(url)) {
      await copyUnSupportedAppContent(frontmostApp);
    }
  }
};
