import {
  copyFirefoxBrowserPath,
  copySafariWebAppPath,
  getChromiumBrowserPath,
  getFocusFinderPath,
  getFocusWindowPath,
  getFocusWindowTitle,
  getQSpacePathUrls,
  getWebkitBrowserPath,
} from "./applescript-utils";
import {
  Application,
  captureException,
  Clipboard,
  FileSystemItem,
  getSelectedFinderItems,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  updateCommandMetadata,
  getPreferenceValues,
} from "@raycast/api";
import {
  copyUrlContent,
  copyWhenUnSupported,
  multiPathSeparator,
  showCopyTip,
  showLastCopy,
  showTabTitle,
} from "../types/preferences";
import parseUrl from "parse-url";
import * as os from "node:os";
import { firefoxBrowsers } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const copyFinderCurWindowPath = async () => {
  const finderPath = await getFocusFinderPath();
  return { hud: "📂 " + finderPath, path: finderPath };
};

const copyFinerFilesPath = async (fileSystemItems: FileSystemItem[]) => {
  const filePaths = fileSystemItems.map((item) => item.path);
  return {
    hud: (filePaths.length > 1 ? "📑 " : "📄 ") + filePaths[0],
    path: filePaths.join(multiPathSeparator),
  };
};

const qSpaceUrlToPath = (url: string) => {
  if (!url.startsWith("file://")) {
    return url;
  }

  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    try {
      return decodeURIComponent(url.replace(/^file:\/\/(?:localhost)?/, ""));
    } catch {
      return url;
    }
  }
};

export const copyQSpacePath = async () => {
  const { useTildeForHome } = await getPreferenceValues();
  const urls = await getQSpacePathUrls();
  const paths = urls
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
    .map(qSpaceUrlToPath);

  if (paths.length === 0) {
    await showFailureHUD({ title: "Nothing to Copy", style: Toast.Style.Failure });
    return "";
  }

  let path = paths.join(multiPathSeparator);
  let hud = (paths.length > 1 ? "📑 " : "📂 ") + paths[0];

  if (useTildeForHome) {
    path = path.replace(os.homedir(), "~");
    hud = hud.replace(os.homedir(), "~");
  }

  await Clipboard.copy(path);
  await showSuccessHUD(hud);
  await customUpdateCommandMetadata(path.replace(os.homedir(), "~"));
  return path;
};

export const copyFinderPath = async () => {
  const { useTildeForHome } = await getPreferenceValues();
  // get finder path
  try {
    const fileSystemItems = await getSelectedFinderItems();
    let copyPathResult;
    if (fileSystemItems.length === 0) {
      copyPathResult = await copyFinderCurWindowPath();
    } else {
      copyPathResult = await copyFinerFilesPath(fileSystemItems);
    }
    if (useTildeForHome) {
      copyPathResult.path = copyPathResult.path.replace(os.homedir(), "~");
      copyPathResult.hud = copyPathResult.hud.replace(os.homedir(), "~");
    }
    await Clipboard.copy(copyPathResult.path);
    await showSuccessHUD(copyPathResult.hud);
    await customUpdateCommandMetadata(copyPathResult.path.replace(os.homedir(), "~"));
  } catch (e) {
    console.error(String(e));
  }
};

export const copyWindowPath = async (app: Application) => {
  const { useTildeForHome } = await getPreferenceValues();
  let path = await getFocusWindowPath(app);
  if (useTildeForHome) {
    path = path.replace(os.homedir(), "~");
  }
  if (!isEmpty(path)) {
    await Clipboard.copy(path);
    await showSuccessHUD("📂 " + path);
    await customUpdateCommandMetadata(path);
  }
  return path;
};

const tryCopyBrowserUrl = async (app: Application) => {
  // get extra browser web page url
  let url = await getChromiumBrowserPath(app.name);
  if (isEmpty(url)) {
    url = await getWebkitBrowserPath(app.name);
  }
  return url;
};

export const copyUnSupportedAppContent = async (app: Application) => {
  let hudIcon: string;
  let copyContent: string;
  let shouldCopy = true;
  switch (copyWhenUnSupported) {
    case "windowTitle": {
      hudIcon = "🖥️ ";
      copyContent = await getFocusWindowTitle(app);
      break;
    }
    case "appName": {
      hudIcon = "💻 ";
      copyContent = app.name;
      break;
    }
    case "appPath": {
      hudIcon = "📂 ";
      copyContent = app.path;
      break;
    }
    case "bundleId": {
      hudIcon = "🪪 ";
      copyContent = app.bundleId ?? "";
      break;
    }
    default: {
      hudIcon = "";
      copyContent = "";
      shouldCopy = false;
      break;
    }
  }
  if (shouldCopy) {
    await Clipboard.copy(copyContent);
    await showSuccessHUD(hudIcon + copyContent);
    await customUpdateCommandMetadata(copyContent);
  } else {
    await showFailureHUD({ title: "Nothing to Copy", style: Toast.Style.Failure });
  }
  return copyContent;
};

export const copyBrowserTabUrl = async (frontmostApp: Application) => {
  // get browser web page url
  let url = await tryCopyBrowserUrl(frontmostApp);
  let shouldCopy = true; // if it has copied in copy***Path, then do not copy again
  let copyContent: string;
  console.log(url);
  console.log(frontmostApp);
  if (isEmpty(url)) {
    if (firefoxBrowsers.includes(frontmostApp.name.toLowerCase())) {
      url = await copyFirefoxBrowserPath(frontmostApp.name);
    } else if (frontmostApp.bundleId?.startsWith("com.apple.Safari.WebApp")) {
      url = await copySafariWebAppPath(frontmostApp.name);
    }
    shouldCopy = false;
  }

  if (isEmpty(url)) {
    return url;
  } else {
    try {
      // handle url
      copyContent = parseURL(url);
      if (showTabTitle) {
        const windowTitle = await getFocusWindowTitle(frontmostApp);
        copyContent = `${windowTitle}\n${copyContent}`;
      }
      if (shouldCopy) {
        await Clipboard.copy(copyContent);
      }
      await showSuccessHUD("🔗 " + copyContent);
      await customUpdateCommandMetadata(new URL(url).hostname);
      return url;
    } catch (e) {
      return url;
    }
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

export const customUpdateCommandMetadata = async (content: string) => {
  if (showLastCopy) {
    await updateCommandMetadata({ subtitle: content });
  } else {
    await updateCommandMetadata({ subtitle: "Copy Path" });
  }
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

export const showFailureHUD = async (options: Toast.Options) => {
  if (showCopyTip) {
    await showToast(options);
  }
};
