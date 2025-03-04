import fs from "fs";
import os from "os";
import ini from "ini";
import { join } from "path";

import browsers from "./supported-browsers.json";
import { sortProfiles } from "./utils";

type FirefoxProfiles = {
  name: string;
  profiles: FirefoxProfile[];
};

type FirefoxProfile = {
  type: string;
  browser: string;
  app: string;
  path: string;
  name: string;
  icon: string;
};

export const getFirefoxProfiles = () => {
  const profiles: FirefoxProfiles[] = [];

  browsers.firefox
    .filter((browser) => fs.existsSync(browser.app))
    .forEach((browser) => {
      const path = join(os.homedir(), browser.path, "profiles.ini");
      const exists = fs.existsSync(path);

      if (!exists) {
        return null;
      }

      const file = fs.readFileSync(path, "utf-8");
      const config = ini.parse(file);

      const browserProfiles: FirefoxProfile[] = [];

      Object.values(config).forEach((profile) => {
        if (!profile.Name) {
          return null;
        }

        browserProfiles.push({
          type: browser.type,
          browser: browser.title,
          app: browser.app,
          path: profile.Name,
          name: profile.Name,
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
