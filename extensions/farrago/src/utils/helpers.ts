import { Application, getApplications, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";

import { DBSoundSet, DBSoundTile, Preferences } from "@/types";

import { DEFAULT_SHORTCUT_TITLE_TEMPLATE, FARRAGO_BUNDLE_ID, TILE_COLORS_BY_INDEX } from "./constants";

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

export function expandTilde(inputPath: string) {
  if (inputPath.startsWith("~")) {
    // Get the home directory
    const homeDir = os.homedir();
    // Replace '~' with the home directory
    return path.join(homeDir, inputPath.slice(1));
  }
  return inputPath;
}

export function getTileColorByIndex(index: number) {
  return TILE_COLORS_BY_INDEX[index];
}

export function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  } else {
    const hrs = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const mins = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  }
}

export function applyShortcutTitleTemplate({
  tile,
  set,
  template,
}: {
  tile: DBSoundTile;
  set: DBSoundSet;
  template?: string;
}) {
  template ||= DEFAULT_SHORTCUT_TITLE_TEMPLATE;

  const variableGetters: Record<string, (t: DBSoundTile, s: DBSoundSet) => string> = {
    set: (_, s) => s.title,
    title: (t) => t.title,
    icons: (t) => t.tileIcon.join(" "),
    firstIcon: (t) => t.tileIcon.at(0) ?? "",
  };

  const cached: Record<string, string> = {};

  return template.replaceAll(/{{\s*(\w+)\s*}}/g, (_, varName) => {
    const cachedValue = cached[varName];
    if (cachedValue) return cachedValue;

    const getter = variableGetters[varName];
    const result = getter?.(tile, set) ?? `{{${varName}}}`;
    cached[varName] = result;

    return result;
  });
}

export async function findApplication(bundleId: string): Promise<Application | undefined> {
  const installedApplications = await getApplications();
  return installedApplications.filter((application) => application.bundleId == bundleId)[0];
}

export async function isAppRunning(bundleId: string) {
  const script = `
    tell application "System Events"
      return (exists (every process whose bundle identifier is "${bundleId}"))
    end tell
  `;
  const res = await runAppleScript(script, { humanReadableOutput: true });
  return res.trim() === "true";
}

export async function isFarragoRunning() {
  return await isAppRunning(FARRAGO_BUNDLE_ID);
}

export async function findFarrago() {
  return await findApplication(FARRAGO_BUNDLE_ID);
}

export async function checkFarragoExists() {
  return !!(await findFarrago());
}

export async function launchApplication(bundleId: string) {
  return await runAppleScript(`
    do shell script "open -b ${bundleId}"
  `);
}

export async function launchFarrago() {
  return await launchApplication(FARRAGO_BUNDLE_ID);
}

export async function farragoDataDirExists() {
  const { farragoDataDir } = getPreferences();

  try {
    const stats = await fs.promises.stat(expandTilde(farragoDataDir));
    return stats.isDirectory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

export class AbortError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "AbortError";
  }
}

export function ignoreAbortError<E>(err: E, elseCallback?: (e: E) => unknown) {
  elseCallback ??= (e) => {
    throw e;
  };

  if (err instanceof AbortError) {
    // ignoring...
  } else {
    return elseCallback(err);
  }
}
