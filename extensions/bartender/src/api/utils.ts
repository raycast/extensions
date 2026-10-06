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
  /** Undefined if the version couldn't be determined */
  majorVersion?: number;
};

type BartenderCandidate = BartenderApp & { appPath: string };

// Setapp ships the app as plain "Bartender", whose version is read from its Info.plist.
const BARTENDER_APP_NAMES = ["Bartender 7", "Bartender 6", "Bartender", "Bartender 5"];

async function readMajorVersion(appPath: string, appName: string): Promise<number | undefined> {
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
  return isNaN(versionInName) ? undefined : versionInName;
}

async function toCandidate(appPath: string): Promise<BartenderCandidate> {
  const name = path.basename(appPath, ".app");
  return { appPath, name, majorVersion: await readMajorVersion(appPath, name) };
}

async function findBartenderAppsInStandardLocations(): Promise<BartenderCandidate[]> {
  const homeDir = os.homedir();
  const directories = [
    "/Applications",
    `${homeDir}/Applications`,
    "/Applications/Setapp",
    `${homeDir}/Applications/Setapp`,
  ];

  const appPaths = BARTENDER_APP_NAMES.flatMap((name) =>
    directories.map((directory) => path.join(directory, `${name}.app`)),
  ).filter((appPath) => fs.existsSync(appPath));
  return await Promise.all(appPaths.map(toCandidate));
}

// Finds installs elsewhere (e.g. an external drive or a custom folder) through Spotlight.
// The wildcard covers the Setapp build, which has a different bundle identifier suffix.
async function findBartenderAppsWithSpotlight(): Promise<BartenderCandidate[]> {
  try {
    const { stdout } = await execa("mdfind", ['kMDItemCFBundleIdentifier == "com.surteesstudios.Bartender*"']);
    const appPaths = stdout
      .split("\n")
      .filter((appPath) => appPath.endsWith(".app") && path.basename(appPath).startsWith("Bartender"));
    return await Promise.all(appPaths.map(toCandidate));
  } catch (error) {
    console.error("Error searching for Bartender with Spotlight:", error);
    return [];
  }
}

// Executable paths of everything running, used to tell which installed copy the user is actually using
async function listRunningExecutablePaths(): Promise<string[]> {
  try {
    const { stdout } = await execa("ps", ["-axo", "comm="]);
    return stdout.split("\n").filter((line) => line.includes("Bartender"));
  } catch (error) {
    console.error("Error listing running processes:", error);
    return [];
  }
}

/**
 * Finds the installed Bartender app (and its version).
 * If several are installed, prefers the one that is running, then the newest.
 * Throws BartenderNotInstalledError if there is none.
 * Deliberately not cached, so installing or upgrading Bartender while Raycast is open is picked up.
 */
export async function getBartenderApp(): Promise<BartenderApp> {
  const [standard, spotlight, running] = await Promise.all([
    findBartenderAppsInStandardLocations(),
    findBartenderAppsWithSpotlight(),
    listRunningExecutablePaths(),
  ]);

  const candidates = [...standard, ...spotlight].filter(
    (candidate, index, all) => all.findIndex((other) => other.appPath === candidate.appPath) === index,
  );
  const isRunning = (candidate: BartenderCandidate) =>
    running.some((executablePath) => executablePath.startsWith(`${candidate.appPath}/`));
  // Apps with an unknown version rank last among those that aren't running
  candidates.sort(
    (a, b) => Number(isRunning(b)) - Number(isRunning(a)) || (b.majorVersion ?? 0) - (a.majorVersion ?? 0),
  );

  if (candidates.length === 0) {
    throw new BartenderNotInstalledError();
  }
  const { name, majorVersion } = candidates[0];
  return { name, majorVersion };
}

export async function getTellApplication(): Promise<string> {
  const { name } = await getBartenderApp();
  return `tell application "${name}"`;
}
