import fs from "fs";
import os from "os";

import browsers from "./supported-browsers.json";
import { sortProfiles } from "./utils";

type ChromiumProfiles = {
  name: string;
  profiles: ChromiumProfile[];
};

export type ChromiumProfile = {
  type: string;
  browser: string;
  app: string;
  path: string;
  name: string;
  icon: string;
};

export const getChromiumProfiles = () => {
  const profiles: ChromiumProfiles[] = [];

  browsers.chromium.forEach((browser) => {
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

    const localStateFile = fs.readFileSync(localStatePath, "utf-8");
    const localState = JSON.parse(localStateFile).profile.info_cache as Record<
      string,
      {
        name: string;
      }
    >;

    const browserProfiles: ChromiumProfile[] = Object.entries(localState).map(
      ([profileDir, { name: profileName }]) => ({
        type: browser.type,
        browser: browser.title,
        app: browser.app,
        path: profileDir,
        name: profileName,
        icon: browser.icon,
      })
    );

    sortProfiles(browserProfiles);

    profiles.push({
      name: browser.title,
      profiles: browserProfiles,
    });
  });

  return profiles;
};
