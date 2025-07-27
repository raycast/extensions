import { checkIsFile, isDeeplink, searchUrlBuilder, showHud, urlBuilder } from "./common-utils";
import { Alert, confirmAlert, Icon, open, openCommandPreferences, showInFinder } from "@raycast/api";
import { checkShortcut, runShortcut } from "./shell-utils";
import { SHORTCUT_PEEK_IN_SAFARI_NAME, SHORTCUT_PEEK_IN_SAFARI_URL } from "./constants";
import { fileAction, folderAction, preferredTerminal, searchEngine, urlAction } from "../types/preference";
import validator from "validator";

export const filePathAction = async (path: string) => {
  const isFile = checkIsFile(path);
  const icon = isFile ? "📄" : "📂";
  if (isFile) {
    if (fileAction === "showInFinder") {
      await showInFinder(path);
      await showHud(icon, "Show: " + path);
    } else {
      await open(path);
      await showHud(icon, "Open: " + path);
    }
  } else if (!isFile) {
    if (folderAction === "showInFinder") {
      await showInFinder(path);
      await showHud(icon, "Show: " + path);
    } else {
      await open(path);
      await showHud(icon, "Open: " + path);
    }
  } else {
    await showHud("🚨", "Error Path: " + path);
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
    if (validator.isURL(path)) {
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
    await showHud("🚨", "Error: " + e);
  }
};

export const openPathInTerminal = async (path: string) => {
  if (preferredTerminal) {
    await open(path, preferredTerminal);
    await showHud("📟", `Open in ${preferredTerminal.name}`);
  } else {
    await openCommandPreferences();
    await showHud("⚙️", `Please set the Preferred Terminal.`);
  }
};
