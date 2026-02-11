import fs from "fs";
import os from "os";

import browsers from "./supported-browsers.json";
import { sortProfiles, isBrowserEnabled } from "./utils";
import { BrowserProfile } from "./types";

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

    const path = `${os.homedir()}${browser.path}`;
    const exists = fs.existsSync(path);

    if (!exists) {
      return null;
    }

    const localStatePath = `${path}/Local State`;
    const localStateExists = fs.existsSync(localStatePath);

    if (!localStateExists) {
      return null;
    }

    let localState;
    try {
      const localStateFile = fs.readFileSync(localStatePath, "utf-8");
      localState = JSON.parse(localStateFile);
    } catch (error) {
      return null;
    }

    const infoCacheData = localState?.profile?.info_cache as
      | Record<
          string,
          {
            name: string;
          }
        >
      | undefined;

    if (!infoCacheData) {
      return null;
    }

    const profileDirectories = Object.keys(infoCacheData);

    const browserProfiles: BrowserProfile[] = [];

    profileDirectories.forEach((directory: string) => {
      let profile;
      try {
        const preferencesPath = `${path}/${directory}/Preferences`;
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

      const profileLabel = infoCacheData[directory]?.name || profileName;

      browserProfiles.push({
        type: browser.type,
        browser: browser.title,
        app: browser.app,
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
