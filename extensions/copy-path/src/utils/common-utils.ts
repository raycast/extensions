import {
  getChromiumBrowserPath,
  copyFirefoxBrowserPath,
  getFocusFinderPath,
  getFocusWindowTitle,
  copySafariWebAppPath,
  getWebkitBrowserPath,
} from "./applescript-utils";
import {
  Application,
  captureException,
  Clipboard,
  getSelectedFinderItems,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { chromiumBrowserNames, webkitBrowserNames } from "./constants";
import { copyUrlContent, multiPathSeparator, showCopyTip, showLastCopy, showTabTitle } from "../types/preferences";
import parseUrl from "parse-url";

export const copyFinderPath = async () => {
  const finderPath = await getFocusFinderPath();
  const finalPath = finderPath.endsWith("/") && finderPath.length !== 1 ? finderPath.slice(0, -1) : finderPath;
  await Clipboard.copy(finalPath);
  await showSuccessHUD("📂 " + finalPath);
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
      await showSuccessHUD(filePaths.length > 1 ? "📑 " + filePaths[0] + "..." : "📄 " + filePaths[0]);
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
  let shouldCopy = true; // if it has copied in copy***Path, then do not copy again
  let copyContent: string;
  if (webkitBrowserNames.includes(frontmostApp.name)) {
    url = await getWebkitBrowserPath(frontmostApp.name);
  } else if (chromiumBrowserNames.includes(frontmostApp.name)) {
    url = await getChromiumBrowserPath(frontmostApp.name);
  } else if (frontmostApp.name.toLowerCase().includes("firefox")) {
    url = await copyFirefoxBrowserPath(frontmostApp.name);
    shouldCopy = false;
  } else if (frontmostApp.bundleId?.startsWith("com.apple.Safari.WebApp")) {
    url = await copySafariWebAppPath(frontmostApp.name);
    shouldCopy = false;
  }

  if (url === "") {
    const windowTitle = await getFocusWindowTitle();
    copyContent = windowTitle;
    await showSuccessHUD("🖥️ " + windowTitle);
  } else {
    // handle url
    copyContent = parseURL(url);
    if (showTabTitle) {
      const windowTitle = await getFocusWindowTitle();
      copyContent = `${windowTitle}\n${copyContent}`;
    }
    await showSuccessHUD("🔗 " + copyContent);
    await customUpdateCommandMetadata(copyContent);
  }

  if (shouldCopy) {
    await Clipboard.copy(copyContent);
  }
};

const parseURL = (url: string) => {
  try {
    const parsedUrl = parseUrl(url);
    switch (copyUrlContent) {
      case "Protocol://host/pathname": {
        return parsedUrl.protocol + "://" + parsedUrl.resource + parsedUrl.pathname;
      }
      case "Protocol://host": {
        return parsedUrl.protocol + "://" + parsedUrl.resource;
      }
      case "Host": {
        return parsedUrl.resource;
      }
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
  return url;
};

export const showLoadingHUD = async (title: string) => {
  if (showCopyTip) {
    await showToast({ title: title, style: Toast.Style.Animated });
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
