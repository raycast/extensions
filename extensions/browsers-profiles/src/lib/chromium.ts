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

    const directories = fs.readdirSync(path);

    const browserProfiles: BrowserProfile[] = [];

    directories.forEach((directory: string) => {
      const preferences = `${path}/${directory}/Preferences`;
      const file = fs.readFileSync(preferences, "utf-8");
      const profile = JSON.parse(file);
      const profileName = profile.profile.name;
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
