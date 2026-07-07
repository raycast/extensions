import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SafariApp } from "./types";

type KnownSafariApp = Omit<SafariApp, "path"> & {
  relativePaths: string[];
};

const APPLICATION_DIRECTORIES = ["/Applications", join(homedir(), "Applications")];

const KNOWN_SAFARI_APPS: KnownSafariApp[] = [
  {
    id: "safari",
    name: "Safari",
    bundleIdentifier: "com.apple.Safari",
    relativePaths: ["Safari.app"],
  },
  {
    id: "safari-technology-preview",
    name: "Safari Technology Preview",
    bundleIdentifier: "com.apple.SafariTechnologyPreview",
    relativePaths: ["Safari Technology Preview.app"],
  },
  {
    id: "safari-nightly",
    name: "Safari Nightly",
    bundleIdentifier: "com.apple.Safari",
    relativePaths: ["Safari Nightly.app"],
  },
];

type PathExists = (path: string) => Promise<boolean>;

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getInstalledSafariApps(
  exists: PathExists = pathExists,
  applicationDirectories = APPLICATION_DIRECTORIES,
): Promise<SafariApp[]> {
  const apps = await Promise.all(
    KNOWN_SAFARI_APPS.map(async (app) => {
      for (const applicationDirectory of applicationDirectories) {
        for (const relativePath of app.relativePaths) {
          const appPath = join(applicationDirectory, relativePath);
          if (await exists(appPath)) {
            return {
              id: app.id,
              name: app.name,
              path: appPath,
              bundleIdentifier: app.bundleIdentifier,
            };
          }
        }
      }

      return null;
    }),
  );

  return apps.filter((app): app is SafariApp => Boolean(app));
}
