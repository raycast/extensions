import fs from "fs";
import path from "path";
import { DEFAULT_CHROME_PROFILE_ID, defaultChromeProfilePath, defaultChromeStatePath } from "../constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../interfaces";

type ChromeFile = "History" | "Bookmarks";
const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};
const getChromeFilePath = (fileName: ChromeFile, profile?: string) => {
  const { profilePath } = getPreferenceValues<Preferences>();
  let resolvedProfilePath;
  if (profilePath) {
    resolvedProfilePath = path.join(profilePath, fileName);
  } else {
    resolvedProfilePath = path.join(
      userLibraryDirectoryPath(),
      ...defaultChromeProfilePath,
      profile ?? DEFAULT_CHROME_PROFILE_ID,
      fileName
    );
  }

  if (!fs.existsSync(resolvedProfilePath)) {
    throw new Error(
      `The profile path ${resolvedProfilePath} does not exist. Please check your Chrome profile location by visiting chrome://version -> Profile Path. Then update it in Extension Settings -> Profile Path.`
    );
  }

  return resolvedProfilePath;
};

export const getHistoryDbPath = (profile?: string) => getChromeFilePath("History", profile);

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultChromeStatePath);

export const getBookmarksFilePath = (profile?: string) => getChromeFilePath("Bookmarks", profile);
