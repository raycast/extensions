import fs from "fs";
import os from "os";
import ini from "ini";
import { join } from "path";

import browsers from "./supported-browsers.json";
import { sortProfiles, isBrowserEnabled } from "./utils";
import { BrowserProfile, Browser } from "./types";

type BrowserProfiles = {
  name: string;
  profiles: BrowserProfile[];
};

type FirefoxProfileSection = {
  Name?: string;
  Path?: string;
  IsRelative?: string | number;
  StoreID?: string;
};

type ParsedFirefoxProfileSection = {
  Name: string;
  Path: string;
  IsRelative?: string | number;
  StoreID?: string;
};

type FirefoxInstallSection = {
  Default?: string;
};

type FirefoxStoreProfile = {
  path: string;
  name: string;
};

const normalizeProfilePath = (profilePath: string) => profilePath.replace(/[\\/]+/g, "/").toLowerCase();

const getFolderName = (profilePath: string) => {
  const normalized = normalizeProfilePath(profilePath);
  const parts = normalized.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
};

const isAbsolutePath = (profilePath: string) => /^([a-z]:[\\/]|\\\\|\/)/i.test(profilePath);

const getProfilesFromStore = (storeDbPath: string) => {
  const profiles: FirefoxStoreProfile[] = [];

  if (!fs.existsSync(storeDbPath)) return profiles;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqlite = require("node:sqlite") as {
      DatabaseSync: new (path: string, options?: Record<string, unknown>) => {
        prepare: (sql: string) => {
          all: () => Array<{ path?: string; name?: string }>;
        };
        close: () => void;
      };
    };

    const db = new sqlite.DatabaseSync(storeDbPath, { readOnly: true });

    try {
      const rows = db.prepare("SELECT path, name FROM Profiles WHERE path IS NOT NULL AND name IS NOT NULL").all();

      rows.forEach((row) => {
        if (!row.path || !row.name) return;
        profiles.push({ path: row.path, name: row.name });
      });
    } finally {
      db.close();
    }
  } catch {
    // Ignore sqlite errors (unsupported runtime, locked/corrupted DB, etc.)
  }

  return profiles;
};

export const getFirefoxProfiles = (filter: string[]) => {
  const profiles: BrowserProfiles[] = [];
  const isWin = os.platform() === "win32";

  // Firefox variants on Windows share the same user-data root.
  const seenPaths = new Set<string>();

  const filteredBrowsers = browsers.firefox.filter((browser) => {
    if (!isBrowserEnabled(filter, browser)) return false;

    const browserConfig = browser as Browser;

    if (isWin) {
      const winPath = browserConfig.pathWindows;
      if (!winPath) return false;
      if (seenPaths.has(winPath)) return false;
      seenPaths.add(winPath);
      return true;
    }

    return fs.existsSync(browser.app);
  });

  filteredBrowsers.forEach((browser) => {
    const browserConfig = browser as Browser;
    const basePath = isWin ? browserConfig.pathWindows : browser.path;
    if (!basePath) return;

    const firefoxBasePath = join(os.homedir(), basePath);
    const iniPath = join(firefoxBasePath, "profiles.ini");
    if (!fs.existsSync(iniPath)) return;

    const browserProfiles: BrowserProfile[] = [];
    const seenProfilePaths = new Set<string>();
    const storeProfileNamesCache = new Map<string, Map<string, string>>();

    try {
      const file = fs.readFileSync(iniPath, "utf-8");
      const config = ini.parse(file) as Record<string, unknown>;
      const profileSections: ParsedFirefoxProfileSection[] = [];
      const profilesByPath = new Map<string, ParsedFirefoxProfileSection>();

      Object.keys(config).forEach((sectionKey) => {
        if (!/^Profile\d+$/i.test(sectionKey)) return;

        const section = config[sectionKey] as FirefoxProfileSection;
        if (!section || !section.Name || !section.Path) return;

        const parsedSection: ParsedFirefoxProfileSection = {
          Name: section.Name,
          Path: section.Path,
          IsRelative: section.IsRelative,
          StoreID: section.StoreID,
        };

        profileSections.push(parsedSection);
        profilesByPath.set(normalizeProfilePath(parsedSection.Path), parsedSection);
      });

      const activeStoreIds = new Set<string>();

      Object.keys(config).forEach((sectionKey) => {
        if (!/^Install/i.test(sectionKey)) return;

        const installSection = config[sectionKey] as FirefoxInstallSection;
        if (!installSection?.Default) return;

        const defaultProfileSection = profilesByPath.get(normalizeProfilePath(installSection.Default));
        if (!defaultProfileSection?.StoreID) return;

        activeStoreIds.add(defaultProfileSection.StoreID);
      });

      const storeIdsFromProfiles = new Set(
        profileSections.map((section) => section.StoreID).filter((storeId): storeId is string => !!storeId)
      );

      const storeIdsToLoad = activeStoreIds.size ? activeStoreIds : storeIdsFromProfiles;
      let loadedStoreProfiles = 0;

      const pushProfile = (profilePath: string, displayName: string) => {
        const fullPath = isAbsolutePath(profilePath) ? profilePath : join(firefoxBasePath, profilePath);
        if (!fs.existsSync(fullPath)) return;

        const normalizedFullPath = normalizeProfilePath(fullPath);
        if (seenProfilePaths.has(normalizedFullPath)) return;
        seenProfilePaths.add(normalizedFullPath);

        browserProfiles.push({
          type: browser.type,
          browser: browser.title,
          app: isWin ? browserConfig.appWindows || browser.app : browser.app,
          path: fullPath,
          name: displayName,
          icon: browser.icon,
          label: displayName,
          uid: profilePath,
        });
      };

      storeIdsToLoad.forEach((storeId) => {
        const storeDbPath = join(firefoxBasePath, "Profile Groups", `${storeId}.sqlite`);
        const storeProfiles = getProfilesFromStore(storeDbPath);
        if (!storeProfiles.length) return;

        loadedStoreProfiles += storeProfiles.length;

        const nameMap = new Map<string, string>();
        storeProfiles.forEach((profile) => {
          nameMap.set(normalizeProfilePath(profile.path), profile.name);

          const folderName = getFolderName(profile.path);
          if (folderName) {
            nameMap.set(`folder:${folderName}`, profile.name);
          }
        });

        storeProfileNamesCache.set(storeId, nameMap);
        storeProfiles.forEach((profile) => pushProfile(profile.path, profile.name));
      });

      const restrictToActiveStore = activeStoreIds.size > 0 && loadedStoreProfiles > 0;

      // Fallback for older Firefox setups or missing sqlite rows.
      profileSections.forEach((section) => {
        if (restrictToActiveStore && section.StoreID && !activeStoreIds.has(section.StoreID)) {
          return;
        }

        const profilePath = section.Path;
        let displayName = section.Name;
        const storeId = section.StoreID;

        if (storeId) {
          const storeProfileNames = storeProfileNamesCache.get(storeId);

          if (storeProfileNames) {
            const normalizedPath = normalizeProfilePath(profilePath);
            const folderName = getFolderName(profilePath);

            displayName =
              storeProfileNames.get(normalizedPath) || storeProfileNames.get(`folder:${folderName}`) || displayName;
          }
        }

        pushProfile(profilePath, displayName);
      });
    } catch {
      // Ignore INI parse/read errors.
    }

    sortProfiles(browserProfiles);

    profiles.push({
      name: browser.title,
      profiles: browserProfiles,
    });
  });

  return profiles;
};
