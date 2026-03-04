import {
  copyFirefoxBrowserPath,
  copySafariWebAppPath,
  getChromiumBrowserPath,
  getFocusFinderPath,
  getFocusWindowPath,
  getFocusWindowTitle,
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
  urlCleanupMode,
} from "../types/preferences";
import parseUrl from "parse-url";
import * as os from "node:os";
import { firefoxBrowsers } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const trackingParamNames = new Set([
  "gclid",
  "dclid",
  "fbclid",
  "msclkid",
  "twclid",
  "li_fat_id",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "_hsenc",
  "_hsmi",
]);

const trackingParamPrefixes = ["utm_"];

const isTrackingParam = (paramName: string) => {
  const lowered = paramName.toLowerCase();
  if (trackingParamNames.has(lowered)) {
    return true;
  }
  return trackingParamPrefixes.some((prefix) => lowered.startsWith(prefix));
};

const cleanupUrl = (rawUrl: string) => {
  if (urlCleanupMode === "none") {
    return rawUrl;
  }
  try {
    const parsed = new URL(rawUrl);
    if (urlCleanupMode === "removeQueryAndFragment") {
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    }
    if (urlCleanupMode === "removeTracking") {
      const params = new URLSearchParams(parsed.search);
      const filtered = new URLSearchParams();
      params.forEach((value, key) => {
        if (!isTrackingParam(key)) {
          filtered.append(key, value);
        }
      });
      const filteredSearch = filtered.toString();
      parsed.search = filteredSearch.length > 0 ? `?${filteredSearch}` : "";
      return parsed.toString();
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
  return rawUrl;
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
      const resolvedUrl = cleanupUrl(url);
      // handle url
      copyContent = parseURL(resolvedUrl);
      if (showTabTitle) {
        const windowTitle = await getFocusWindowTitle(frontmostApp);
        copyContent = `${windowTitle}\n${copyContent}`;
      }
      if (shouldCopy) {
        await Clipboard.copy(copyContent);
      }
      await showSuccessHUD("🔗 " + copyContent);
      await customUpdateCommandMetadata(new URL(resolvedUrl).hostname);
      return resolvedUrl;
    } catch (e) {
      return url;
    }
  }
};

const parseURL = (url: string) => {
  try {
    const parsedUrl = parseUrl(url);
    if (copyUrlContent === "Protocol://host/pathname") {
      return parsedUrl.protocol + "://" + parsedUrl.resource + parsedUrl.pathname;
    }
    if (copyUrlContent === "Protocol://host") {
      return parsedUrl.protocol + "://" + parsedUrl.resource;
    }
    if (copyUrlContent === "Host") {
      return parsedUrl.resource;
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
