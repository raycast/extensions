import fs from "fs";
import os from "os";
import ini from "ini";
import { join } from "path";

import browsers from "./supported-browsers.json";
import { sortProfiles, isBrowserEnabled } from "./utils";
import { BrowserProfile } from "./types";

type BrowserProfiles = {
  name: string;
  profiles: BrowserProfile[];
};

export const getFirefoxProfiles = (filter: string[]) => {
  const profiles: BrowserProfiles[] = [];

  browsers.firefox
    .filter((browser) => fs.existsSync(browser.app) && isBrowserEnabled(filter, browser))
    .forEach((browser) => {
      const path = join(os.homedir(), browser.path, "profiles.ini");
      const exists = fs.existsSync(path);

      if (!exists) {
        return null;
      }

      const file = fs.readFileSync(path, "utf-8");
      const config = ini.parse(file);

      const browserProfiles: BrowserProfile[] = [];

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
          label: profile.Name,
          uid: profile.Name,
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
