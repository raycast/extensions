import fs from "fs";
import os from "os";
import path from "path";

import { sortProfiles } from "./utils";
import { BrowserProfile } from "./types";

type BrowserProfiles = {
  name: string;
  profiles: BrowserProfile[];
};

const orionProfilesPath = path.join(
  os.homedir(),
  "Applications",
  "Orion",
  "Orion Profiles",
);

const findProfileApplications = (directory: string): string[] => {
  const applications: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory() && entry.name.endsWith(".app")) {
      applications.push(entryPath);
    } else if (entry.isDirectory()) {
      applications.push(...findProfileApplications(entryPath));
    }
  }

  return applications;
};

export const getOrionProfiles = (filter: string[]) => {
  if (
    !filter.some((value) => "Orion".includes(value) || "ORION".includes(value))
  ) {
    return [];
  }

  if (!fs.existsSync(orionProfilesPath)) {
    return [];
  }

  const profiles: BrowserProfile[] = [];

  try {
    for (const applicationPath of findProfileApplications(orionProfilesPath)) {
      const profileName = path
        .basename(applicationPath)
        .replace(/^Orion - /, "")
        .replace(/\.app$/, "");

      profiles.push({
        type: "ORION",
        browser: "Orion",
        app: applicationPath,
        path: applicationPath,
        name: profileName,
        label: profileName,
        icon: "orion.png",
        uid: applicationPath,
      });
    }
  } catch {
    return [];
  }

  sortProfiles(profiles);

  return profiles.length > 0
    ? ([{ name: "Orion", profiles }] satisfies BrowserProfiles[])
    : [];
};
