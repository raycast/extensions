import fs from "fs";
import os from "os";
import { join } from "path";

import browsers from "./supported-browsers.json";
import { sortProfiles, isBrowserEnabled } from "./utils";
import { BrowserProfile, Browser } from "./types";

type BrowserProfiles = {
  name: string;
  profiles: BrowserProfile[];
};

export const getChromiumProfiles = (filter: string[]) => {
  const profiles: BrowserProfiles[] = [];

  browsers.chromium.forEach((browser) => {
    if (!isBrowserEnabled(filter, browser)) {
      return null;
    }

    const isWin = os.platform() === "win32";
    const browserConfig = browser as Browser;
    const basePath = isWin ? browserConfig.pathWindows : browser.path;
    if (!basePath) return null;

    const pathLocal = join(os.homedir(), basePath);
    const exists = fs.existsSync(pathLocal);

    if (!exists) {
      return null;
    }

    const localStatePath = join(pathLocal, "Local State");
    const localStateExists = fs.existsSync(localStatePath);

    if (!localStateExists) {
      return null;
    }

    let localState;
    try {
      const localStateFile = fs.readFileSync(localStatePath, "utf-8");
      localState = JSON.parse(localStateFile);
    } catch {
      return null;
    }

    const infoCacheData = (localState?.profile?.info_cache || {}) as Record<string, { name: string }>;

    const profileDirectories = Object.keys(infoCacheData);

    try {
      const entries = fs.readdirSync(pathLocal, { withFileTypes: true });
      const foundDirs = entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            (entry.name === "Default" ||
              /^Profile \d+$/i.test(entry.name) ||
              /^Person \d+$/i.test(entry.name) ||
              entry.name === "Guest Profile" ||
              entry.name === "System Profile")
        )
        .map((entry) => entry.name);

      foundDirs.forEach((dir) => {
        if (!profileDirectories.includes(dir)) {
          profileDirectories.push(dir);
        }
      });
    } catch {
      // Ignore directory read errors and rely on Local State.
    }

    const browserProfiles: BrowserProfile[] = [];

    profileDirectories.forEach((directory: string) => {
      let profile;
      try {
        const preferencesPath = join(pathLocal, directory, "Preferences");
        if (!fs.existsSync(preferencesPath)) {
          return;
        }
        const file = fs.readFileSync(preferencesPath, "utf-8");
        profile = JSON.parse(file);
      } catch {
        return;
      }

      const profileName = profile?.profile?.name;
      if (!profileName) {
        return;
      }

      const profileLabel = infoCacheData?.[directory]?.name || profileName;

      browserProfiles.push({
        type: browser.type,
        browser: browser.title,
        app: isWin ? browserConfig.appWindows || browser.app : browser.app,
        path: directory,
        name: profileName,
        uid: directory,
        label: profileLabel,
        icon: browser.icon,
      });
    });

    sortProfiles(browserProfiles);

    profiles.push({
      name: browser.title,
      profiles: browserProfiles,
    });
  });

  return profiles;
};
