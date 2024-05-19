import {
  checkIsFile,
  isDeeplink,
  isUrl,
  searchEngine,
  searchUrlBuilder,
  showHud,
  urlAction,
  urlBuilder,
} from "./common-utils";
import { Alert, confirmAlert, Icon, open, showInFinder } from "@raycast/api";
import { checkShortcut, runShortcut } from "./shell-utils";
import { SHORTCUT_PEEK_IN_SAFARI_NAME, SHORTCUT_PEEK_IN_SAFARI_URL } from "./constants";

export const filePathAction = async (path: string, fileOperation: string) => {
  const icon = checkIsFile(path) ? "📄" : "📂";
  if (fileOperation === "showInFinder") {
    await showHud(icon, "Show: " + path);
    await showInFinder(path);
  } else {
    await showHud(icon, "Open: " + path);
    await open(path);
  }
};

const openPeekUrl = async (input: string) => {
  try {
    // const checkRet = await checkShortcut(SHORTCUT_PEEK_IN_SAFARI_NAME);
    const checkRet = await checkShortcut(SHORTCUT_PEEK_IN_SAFARI_NAME);
    if (checkRet) {
      await runShortcut(SHORTCUT_PEEK_IN_SAFARI_NAME, input);
    } else {
      await shortcutNotInstallAlertDialog();
    }
  } catch (e) {
    console.error(e);
  }
};

export const shortcutNotInstallAlertDialog = async () => {
  const options: Alert.Options = {
    icon: { source: Icon.Compass },
    title: "Shortcut Not Installed",
    message: "Shortcut Peek Url is not installed on your Mac. Please install shortcut to Peek in Safari.",
    primaryAction: {
      title: "Install Shortcut",
      onAction: () => {
        open(SHORTCUT_PEEK_IN_SAFARI_URL, "Shortcuts");
      },
    },
  };
  await confirmAlert(options);
};

export const urlPathAction = async (path: string) => {
  try {
    if (isUrl(path)) {
      await showHud("🔗", "Open URL: " + path);
      const finalPath = urlBuilder("https://", path);
      if (urlAction == "peek") {
        await openPeekUrl(finalPath);
      } else {
        await open(finalPath);
      }
    } else if (isDeeplink(path)) {
      if (!path.startsWith("raycast://")) {
        await showHud("🔗", "Open Deeplink: " + path);
      }
      await open(path);
    } else {
      // Underwriting strategy, execution search
      await showHud("🔍", "Search: " + path);
      const finalPath = searchUrlBuilder(searchEngine, path);
      if (urlAction == "peek") {
        await openPeekUrl(finalPath);
      } else {
        await open(finalPath);
      }
    }
  } catch (e) {
    await showHud("🚫", "Error: " + e);
  }
};
