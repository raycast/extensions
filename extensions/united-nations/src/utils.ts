import process from "node:process";
import { LaunchType, confirmAlert, launchCommand, open } from "@raycast/api";
import { match } from "pinyin-pro";
import { crossLaunchCommand } from "raycast-cross-extension";
import { i18n } from "./i18n.js";
import { LanguageCode, RssItem } from "./types.js";

export const isWindows = process.platform === "win32";

const promptToInstallSay = async () => {
  const confirm = await confirmAlert({
    title: i18n.externalExtensionRequired.title,
    message: i18n.externalExtensionRequired.message,
  });
  if (confirm) await open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/litomore/say`);
};

export const textToSpeech = async (text: string) => {
  try {
    await crossLaunchCommand({
      name: "typeToSay",
      type: LaunchType.Background,
      extensionName: "say",
      ownerOrAuthorName: "litomore",
      arguments: { content: text },
    });
  } catch {
    await promptToInstallSay();
  }
};

export const stopTextToSpeech = async () => {
  try {
    await launchCommand({
      name: "stopRunningSay",
      type: LaunchType.Background,
      extensionName: "say",
      ownerOrAuthorName: "litomore",
      context: { shouldCloseMainWindow: false },
    });
  } catch {
    await promptToInstallSay();
  }
};

export const rightToLeftLanguages = new Set([LanguageCode.Arabic, LanguageCode.Urdu]);

export const lantinSearchLanguages = new Set([
  // Pinyin match
  LanguageCode.Chinese,

  // Contains match
  LanguageCode.Arabic,
  LanguageCode.Russian,
  LanguageCode.Hindi,
  LanguageCode.Urdu,
]);

export const latinSearchFilter = (languageCode: LanguageCode, text: string, searchText: string) => {
  switch (languageCode) {
    case LanguageCode.Chinese: {
      const matched = match(text, searchText) || [];
      return matched.length > 0;
    }

    case LanguageCode.Arabic:
    case LanguageCode.Russian:
    case LanguageCode.Hindi:
    case LanguageCode.Urdu: {
      const replacePattern = /[\s-_/\\:+%&.]/g;
      const textWithoutSpaces = text.replace(replacePattern, "").toLowerCase();
      const searchTextWithoutSpaces = searchText.replace(replacePattern, "").toLowerCase();
      return textWithoutSpaces.includes(searchTextWithoutSpaces);
    }

    // Other language are using Raycast built-in search functionality
    default:
      return true;
  }
};

export const arrayifyRssItem = (rssItem?: RssItem | RssItem[]): RssItem[] => {
  if (Array.isArray(rssItem)) return rssItem;
  if (typeof rssItem === "object") return [rssItem];
  return [];
};

export const stripSpecialEscapedCharacters = (markdownContent: string) =>
  markdownContent
    // We don't want LaTeX content
    .replace(/\\([[\]])/g, "$1");
