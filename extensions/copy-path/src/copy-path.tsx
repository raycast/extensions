import { getWebkitBrowserPath, getFocusFinderPath, getChromiumBrowserPath } from "./utils/applescript-utils";
import {
  Clipboard,
  closeMainWindow,
  getFrontmostApplication,
  getPreferenceValues,
  getSelectedFinderItems,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { Preferences } from "./types/preferences";
import { showFailureToast } from "@raycast/utils";
import { chromiumBrowserNames, finderName, webkitBrowserNames } from "./utils/constants";

export default async () => {
  await closeMainWindow();
  const frontmostApp = await getFrontmostApplication();
  if (frontmostApp.name === finderName) {
    // get finder path
    try {
      const { multiPathSeparator } = getPreferenceValues<Preferences>();
      const fileSystemItems = await getSelectedFinderItems();
      if (fileSystemItems.length === 0) {
        await copyFinderPath();
      } else {
        const filePaths = fileSystemItems.map((item) =>
          item.path.endsWith("/") && item.path.length !== 1 ? item.path.slice(0, -1) : item.path
        );

        const output = filePaths.join(multiPathSeparator);
        await Clipboard.copy(output);
        await showHUD("📋 " + (filePaths.length > 1 ? filePaths[0] + "..." : filePaths[0]));
        await customUpdateCommandMetadata(output);
      }
    } catch (e) {
      await copyFinderPath();
      console.error(String(e));
    }
  } else {
    // get browser web page url
    let url = "";
    if (webkitBrowserNames.includes(frontmostApp.name)) {
      url = await getWebkitBrowserPath(frontmostApp.name);
    } else if (chromiumBrowserNames.includes(frontmostApp.name)) {
      url = await getChromiumBrowserPath(frontmostApp.name);
    }

    if (url === "") {
      await showFailureToast("No Path or URL found", { title: `Current app is ${frontmostApp.name}` });
    } else {
      await Clipboard.copy(url);
      await showHUD("📋 " + url);
      await customUpdateCommandMetadata(url);
    }
  }
};

const copyFinderPath = async () => {
  const finderPath = await getFocusFinderPath();
  const finalPath = finderPath.endsWith("/") && finderPath.length !== 1 ? finderPath.slice(0, -1) : finderPath;
  await Clipboard.copy(finalPath);
  await showHUD("📋 " + finalPath);
  await customUpdateCommandMetadata(finalPath);
};

const customUpdateCommandMetadata = async (content: string) => {
  const { showLastCopy } = getPreferenceValues<Preferences>();
  if (showLastCopy) {
    await updateCommandMetadata({ subtitle: content });
  } else {
    await updateCommandMetadata({ subtitle: "Copy Path" });
  }
};
