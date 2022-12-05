import fs from "fs";
import path from "path";
import { SupportedBrowsers } from "../interfaces";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

const getProfileName = async (userDirectoryPath: string, browser: SupportedBrowsers) => {
  let profiles;
  switch (browser) {
    case SupportedBrowsers.Chrome:
      return "Default";
    case SupportedBrowsers.Firefox:
      profiles = await fs.promises.readdir(userDirectoryPath);
      return profiles.filter((profile) => profile.endsWith(".default-release"))[0];
    default:
      throw new Error(`Unsupported browser: ${browser}`);
  }
};

export const getHistoryDbPath = async (browser: SupportedBrowsers) => {
  const userDataDirectory = userLibraryDirectoryPath();
  let profilePath, profileName;

  switch (browser) {
    case SupportedBrowsers.Chrome:
      profilePath = path.join(userDataDirectory, "Application Support", "Google", "Chrome");
      profileName = await getProfileName(profilePath, browser);
      return path.join(profilePath, profileName, "History");
    case SupportedBrowsers.Firefox:
      profilePath = path.join(userDataDirectory, "Application Support", "Firefox", "Profiles");
      profileName = await getProfileName(profilePath, browser);
      return path.join(profilePath, profileName, "places.sqlite");
    case SupportedBrowsers.Safari:
      return path.join(userDataDirectory, "Safari", "History.db");
    default:
      throw new Error("Unsupported browser.");
  }
};

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export const isPermissionError = (error: unknown) => {
  return error instanceof Error && error.name === "PermissionError";
};
