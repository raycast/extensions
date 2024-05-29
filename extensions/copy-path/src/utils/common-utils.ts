import { getChromiumBrowserPath, getFocusFinderPath, getWebkitBrowserPath } from "./applescript-utils";
import {
  Application,
  Clipboard,
  getSelectedFinderItems,
  PopToRootType,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { chromiumBrowserNames, webkitBrowserNames } from "./constants";
import { copyUrlContent, multiPathSeparator, showCopyTip, showLastCopy } from "../types/preferences";
import parseUrl from "parse-url";

export const copyFinderPath = async () => {
  const finderPath = await getFocusFinderPath();
  const finalPath = finderPath.endsWith("/") && finderPath.length !== 1 ? finderPath.slice(0, -1) : finderPath;
  await Clipboard.copy(finalPath);
  await showSuccessHUD("📋 " + finalPath);
  await customUpdateCommandMetadata(finalPath);
};

export const customUpdateCommandMetadata = async (content: string) => {
  if (showLastCopy) {
    await updateCommandMetadata({ subtitle: content });
  } else {
    await updateCommandMetadata({ subtitle: "Copy Path" });
  }
};

export const copyPath = async () => {
  // get finder path
  try {
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await copyFinderPath();
    } else {
      const filePaths = fileSystemItems.map((item) =>
        item.path.endsWith("/") && item.path.length !== 1 ? item.path.slice(0, -1) : item.path,
      );

      const output = filePaths.join(multiPathSeparator);
      await Clipboard.copy(output);
      await showSuccessHUD("📋 " + (filePaths.length > 1 ? filePaths[0] + "..." : filePaths[0]));
      await customUpdateCommandMetadata(output);
    }
  } catch (e) {
    await copyFinderPath();
    console.error(String(e));
  }
};
export const copyUrl = async (frontmostApp: Application) => {
  // get browser web page url
  let url = "";
  if (webkitBrowserNames.includes(frontmostApp.name)) {
    url = await getWebkitBrowserPath(frontmostApp.name);
  } else if (chromiumBrowserNames.includes(frontmostApp.name)) {
    url = await getChromiumBrowserPath(frontmostApp.name);
  }

  if (url === "") {
    const finderPath = await getFocusFinderPath();
    await Clipboard.copy(finderPath);
    await showSuccessHUD("🗂️ " + finderPath);
  } else {
    // handle url
    const parsedUrl = parseUrl(url);
    let copyContent = url;
    switch (copyUrlContent) {
      case "Protocol://host/pathname": {
        copyContent = parsedUrl.protocol + "://" + parsedUrl.resource + parsedUrl.pathname;
        break;
      }
      case "Protocol://host": {
        copyContent = parsedUrl.protocol + "://" + parsedUrl.resource;
        break;
      }
      case "Host": {
        copyContent = parsedUrl.resource;
        break;
      }
      default: {
        break;
      }
    }
    await Clipboard.copy(copyContent);
    await showSuccessHUD("🔗 " + copyContent);
    await customUpdateCommandMetadata(copyContent);
  }
};

export const showSuccessHUD = async (
  title: string,
  options?: { clearRootSearch?: boolean | undefined; popToRootType?: PopToRootType | undefined } | undefined,
) => {
  if (showCopyTip) {
    await showHUD(title, options);
  }
};
