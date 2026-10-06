import { execa } from "execa";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Result } from "../types";

export class BartenderNotInstalledError extends Error {
  constructor() {
    super(
      "Bartender must be installed to use this command. You may install it from https://macbartender.com or Setapp.",
    );
    this.name = "BartenderNotInstalledError";
  }
}

export function createResultFromAppleScriptError(error: unknown, defaultMessage: string): Result<never> {
  if (error instanceof BartenderNotInstalledError) {
    return { status: "error", error: error.message };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for Bartender not installed error (-2741 is the AppleScript error code)
  if (errorMessage.includes("-2741") || errorMessage.includes("Application isn't running")) {
    return {
      status: "error",
      error:
        "Bartender must be installed and running to use this command. You may install it from https://macbartender.com or Setapp.",
    };
  }
  return {
    status: "error",
    error: error instanceof Error ? error.message : defaultMessage,
  };
}

export type BartenderApp = {
  /** The name AppleScript uses to address the app, e.g. "Bartender 7" */
  name: string;
  majorVersion: number;
};

// Newest first, so the most recent version wins if several are installed.
// Setapp ships the app as plain "Bartender", whose version is read from its Info.plist.
const BARTENDER_APP_NAMES = ["Bartender 7", "Bartender 6", "Bartender", "Bartender 5"];

// Used when the version can't be determined; assumes a current install rather than an old one.
const FALLBACK_MAJOR_VERSION = 7;

async function readMajorVersion(appPath: string, appName: string): Promise<number> {
  try {
    const { stdout } = await execa("plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      "-o",
      "-",
      path.join(appPath, "Contents", "Info.plist"),
    ]);
    const major = parseInt(stdout, 10);
    if (!isNaN(major)) {
      return major;
    }
  } catch (error) {
    console.error(`Error reading Bartender version from ${appPath}:`, error);
  }
  const versionInName = parseInt(appName.replace("Bartender", "").trim(), 10);
  return isNaN(versionInName) ? FALLBACK_MAJOR_VERSION : versionInName;
}

async function findBartenderAppInStandardLocations(): Promise<BartenderApp | undefined> {
  const homeDir = os.homedir();
  const directories = [
    "/Applications",
    `${homeDir}/Applications`,
    "/Applications/Setapp",
    `${homeDir}/Applications/Setapp`,
  ];

  for (const name of BARTENDER_APP_NAMES) {
    for (const directory of directories) {
      const appPath = path.join(directory, `${name}.app`);
      if (fs.existsSync(appPath)) {
        return { name, majorVersion: await readMajorVersion(appPath, name) };
      }
    }
  }
  return undefined;
}

// Finds installs elsewhere (e.g. an external drive or a custom folder) through Spotlight.
// The wildcard covers the Setapp build, which has a different bundle identifier suffix.
async function findBartenderAppWithSpotlight(): Promise<BartenderApp | undefined> {
  try {
    const { stdout } = await execa("mdfind", ['kMDItemCFBundleIdentifier == "com.surteesstudios.Bartender*"']);
    const apps = await Promise.all(
      stdout
        .split("\n")
        .filter((appPath) => appPath.endsWith(".app") && path.basename(appPath).startsWith("Bartender"))
        .map(async (appPath) => {
          const name = path.basename(appPath, ".app");
          return { name, majorVersion: await readMajorVersion(appPath, name) };
        }),
    );
    return apps.sort((a, b) => b.majorVersion - a.majorVersion)[0];
  } catch (error) {
    console.error("Error searching for Bartender with Spotlight:", error);
    return undefined;
  }
}

/**
 * Finds the installed Bartender app (and its version). Throws BartenderNotInstalledError if there is none.
 * Deliberately not cached, so installing or upgrading Bartender while Raycast is open is picked up.
 */
export async function getBartenderApp(): Promise<BartenderApp> {
  const app = (await findBartenderAppInStandardLocations()) ?? (await findBartenderAppWithSpotlight());
  if (!app) {
    throw new BartenderNotInstalledError();
  }
  return app;
}

export async function getTellApplication(): Promise<string> {
  const { name } = await getBartenderApp();
  return `tell application "${name}"`;
}
