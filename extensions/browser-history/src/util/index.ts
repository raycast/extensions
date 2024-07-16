import fs from "fs";
import path from "path";
import { Preferences, SupportedBrowsers } from "../interfaces";
import { getPreferenceValues } from "@raycast/api";
import {
  defaultProfilePathArc,
  defaultProfilePathBrave,
  defaultProfilePathChrome,
  defaultProfilePathEdge,
  defaultProfilePathFirefox,
  defaultProfilePathIridium,
  defaultProfilePathOpera,
  defaultProfilePathSafari,
  defaultProfilePathVivaldi,
  defaultProfilePathOrion,
  defaultProfilePathSidekick,
} from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

const getProfileName = (userDirectoryPath: string, browser: SupportedBrowsers) => {
  let profiles;
  switch (browser) {
    case SupportedBrowsers.Firefox:
      profiles = fs.readdirSync(userDirectoryPath);
      return profiles.filter((profile) => profile.endsWith(".default-release"))[0];
    default:
      return "Default";
  }
};

export const getHistoryDbPath = (browser: SupportedBrowsers) => {
  const {
    profilePathChrome,
    profilePathFirefox,
    profilePathSafari,
    profilePathEdge,
    profilePathBrave,
    profilePathVivaldi,
    profilePathArc,
    profilePathOpera,
    profilePathIridium,
    profilePathOrion,
    profilePathSidekick,
  } = getPreferenceValues<Preferences>();
  const userDataDirectory = userLibraryDirectoryPath();
  let profilePath, profileName;

  switch (browser) {
    case SupportedBrowsers.Chrome:
      return profilePathChrome
        ? path.join(profilePathChrome, "History")
        : path.join(userDataDirectory, ...defaultProfilePathChrome);
    case SupportedBrowsers.Firefox:
      if (profilePathFirefox) {
        profilePath = profilePathFirefox;
      } else {
        profilePath = path.join(userDataDirectory, ...defaultProfilePathFirefox);
        profileName = getProfileName(profilePath, browser);
        profilePath = path.join(profilePath, profileName);
      }
      return path.join(profilePath, "places.sqlite");
    case SupportedBrowsers.Safari:
      return profilePathSafari
        ? path.join(profilePathSafari, "History.db")
        : path.join(userDataDirectory, ...defaultProfilePathSafari);
    case SupportedBrowsers.Edge:
      return profilePathEdge
        ? path.join(profilePathEdge, "History")
        : path.join(userDataDirectory, ...defaultProfilePathEdge);
    case SupportedBrowsers.Brave:
      return profilePathBrave
        ? path.join(profilePathBrave, "History")
        : path.join(userDataDirectory, ...defaultProfilePathBrave);
    case SupportedBrowsers.Vivaldi:
      return profilePathVivaldi
        ? path.join(profilePathVivaldi, "History")
        : path.join(userDataDirectory, ...defaultProfilePathVivaldi);
    case SupportedBrowsers.Arc:
      return profilePathArc
        ? path.join(profilePathArc, "History")
        : path.join(userDataDirectory, ...defaultProfilePathArc);
    case SupportedBrowsers.Opera:
      return profilePathOpera
        ? path.join(profilePathOpera, "History")
        : path.join(userDataDirectory, ...defaultProfilePathOpera);
    case SupportedBrowsers.Iridium:
      return profilePathIridium
        ? path.join(profilePathIridium, "History")
        : path.join(userDataDirectory, ...defaultProfilePathIridium);
    case SupportedBrowsers.Orion:
      return profilePathOrion
        ? path.join(profilePathOrion, "history")
        : path.join(userDataDirectory, ...defaultProfilePathOrion);
    case SupportedBrowsers.Sidekick:
      return profilePathSidekick
        ? path.join(profilePathSidekick, "History")
        : path.join(userDataDirectory, ...defaultProfilePathSidekick);
    default:
      throw new Error("Unsupported browser.");
  }
};

export const getHistoryTable = (browser: SupportedBrowsers): string => {
  switch (browser) {
    case SupportedBrowsers.Firefox:
      return "moz_places";
    case SupportedBrowsers.Safari:
    case SupportedBrowsers.Orion:
      return "history_items";
    default:
      return "urls";
  }
};

export const getHistoryDateColumn = (browser: SupportedBrowsers): string => {
  switch (browser) {
    case SupportedBrowsers.Firefox:
      return "last_visit_date";
    case SupportedBrowsers.Safari:
      return "visit_time";
    case SupportedBrowsers.Orion:
      return "LAST_VISIT_TIME";
    default:
      return "last_visit_time";
  }
};
