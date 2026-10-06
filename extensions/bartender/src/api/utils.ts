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
  return isNaN(versionInName) ? 5 : versionInName;
}

async function findBartenderApp(): Promise<BartenderApp> {
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
  throw new BartenderNotInstalledError();
}

let bartenderApp: Promise<BartenderApp> | undefined;

/** Finds the installed Bartender app (and its version). Throws BartenderNotInstalledError if there is none. */
export function getBartenderApp(): Promise<BartenderApp> {
  bartenderApp ??= findBartenderApp();
  // Don't cache failures, so installing Bartender while a command is open works
  bartenderApp.catch(() => (bartenderApp = undefined));
  return bartenderApp;
}

export async function getTellApplication(): Promise<string> {
  const { name } = await getBartenderApp();
  return `tell application "${name}"`;
}
