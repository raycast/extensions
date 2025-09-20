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

    const directories = fs.readdirSync(path);

    const browserProfiles: ChromiumProfile[] = [];

    directories.forEach((directory) => {
      const preferences = `${path}/${directory}/Preferences`;

      if (directory === "System Profile" || !fs.existsSync(preferences)) {
        return null;
      }

      const file = fs.readFileSync(preferences, "utf-8");
      const profile = JSON.parse(file);

      browserProfiles.push({
        type: browser.type,
        browser: browser.title,
        app: browser.app,
        path: directory,
        name: profile.profile.name,
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
