import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Application } from "@raycast/api";

export type LayoutLockTarget = {
  bundleID: string;
  urlScheme: string;
  applicationSupportDirectoryName: string;
};

export const productionLayoutLockTarget: LayoutLockTarget = {
  bundleID: "com.berkergungor.layoutlock",
  urlScheme: "layoutlock",
  applicationSupportDirectoryName: "LayoutLock",
};
export const developmentLayoutLockTarget: LayoutLockTarget = {
  bundleID: "com.berkergungor.layoutlock.dev",
  urlScheme: "layoutlock-dev",
  applicationSupportDirectoryName: "LayoutLock Dev",
};
export const layoutLockBundleID = productionLayoutLockTarget.bundleID;
export const layoutLockDownloadURL = "https://layoutlock.app";
export const layoutLockRaycastURL = "https://layoutlock.app/raycast";
export function layoutIndexPath(target: LayoutLockTarget = productionLayoutLockTarget): string {
  return join(
    homedir(),
    "Library",
    "Application Support",
    target.applicationSupportDirectoryName,
    "Integrations",
    "layouts-v1.json",
  );
}

export type LayoutSummary = {
  id: string;
  name: string;
  updatedAt: string;
  windowCount: number;
  appCount: number;
  displayCount: number;
};

export type LayoutIndex = {
  schemaVersion: 1;
  layouts: LayoutSummary[];
};

export class MissingLayoutIndexError extends Error {}
export class UnsupportedLayoutIndexError extends Error {}
export class CorruptLayoutIndexError extends Error {}
export class LayoutLockNotInstalledError extends Error {}

export function decodeLayoutIndex(value: unknown): LayoutIndex {
  if (!isRecord(value)) {
    throw new CorruptLayoutIndexError("The LayoutLock index is not an object.");
  }
  if (value.schemaVersion !== 1) {
    throw new UnsupportedLayoutIndexError("This LayoutLock index version is not supported.");
  }
  if (!Array.isArray(value.layouts) || !value.layouts.every(isLayoutSummary)) {
    throw new CorruptLayoutIndexError("The LayoutLock index is corrupt.");
  }
  return value as LayoutIndex;
}

export async function readLayoutIndex(path = layoutIndexPath()): Promise<LayoutIndex> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      throw new MissingLayoutIndexError("The LayoutLock index does not exist yet.");
    }
    throw error;
  }

  try {
    return decodeLayoutIndex(JSON.parse(contents));
  } catch (error) {
    if (error instanceof UnsupportedLayoutIndexError || error instanceof CorruptLayoutIndexError) {
      throw error;
    }
    throw new CorruptLayoutIndexError("The LayoutLock index is not valid JSON.");
  }
}

export function layoutLockTarget(isDevelopment: boolean): LayoutLockTarget {
  return isDevelopment ? developmentLayoutLockTarget : productionLayoutLockTarget;
}

export function isLayoutLockInstalled(
  applications: Pick<Application, "bundleId">[],
  target: LayoutLockTarget = productionLayoutLockTarget,
): boolean {
  return applications.some((application) => application.bundleId === target.bundleID);
}

export function canDispatchToLayoutLock(
  applications: Pick<Application, "bundleId">[],
  target: LayoutLockTarget,
  isDevelopment: boolean,
): boolean {
  return isDevelopment || isLayoutLockInstalled(applications, target);
}

export function makeRestoreURL(id: string, target: LayoutLockTarget = productionLayoutLockTarget): string {
  const query = new URLSearchParams({ id });
  return `${target.urlScheme}://restore?${query.toString()}`;
}

export function makeCaptureURL(name?: string, target: LayoutLockTarget = productionLayoutLockTarget): string {
  const normalizedName = name?.trim();
  if (!normalizedName) {
    return `${target.urlScheme}://capture`;
  }
  const query = new URLSearchParams({ name: normalizedName });
  const percentEncodedQuery = query.toString().replace(/\+/g, "%20");
  return `${target.urlScheme}://capture?${percentEncodedQuery}`;
}

export function makeOpenArguments(url: string, target: LayoutLockTarget = productionLayoutLockTarget): string[] {
  return ["-gj", "-b", target.bundleID, url];
}

const executeFile = promisify(execFile);

export async function dispatchToLayoutLock(
  url: string,
  target: LayoutLockTarget = productionLayoutLockTarget,
  run: (file: string, args: string[]) => Promise<unknown> = executeFile,
): Promise<void> {
  await run("/usr/bin/open", makeOpenArguments(url, target));
}

export async function dispatchCaptureToCompatibleLayoutLock(
  name?: string,
  target: LayoutLockTarget = productionLayoutLockTarget,
  readIndex: () => Promise<LayoutIndex> = () => readLayoutIndex(layoutIndexPath(target)),
  dispatch: (url: string, target: LayoutLockTarget) => Promise<void> = dispatchToLayoutLock,
): Promise<void> {
  await readIndex();
  await dispatch(makeCaptureURL(name, target), target);
}

export function layoutIndexRecoveryMessage(error: unknown): string | undefined {
  if (error instanceof MissingLayoutIndexError) {
    return "Open or update LayoutLock once, then try again.";
  }
  if (error instanceof UnsupportedLayoutIndexError || error instanceof CorruptLayoutIndexError) {
    return "Update LayoutLock, open it once, then try again.";
  }
  return undefined;
}

export async function openLayoutLock(
  target: LayoutLockTarget = productionLayoutLockTarget,
  run: (file: string, args: string[]) => Promise<unknown> = executeFile,
): Promise<void> {
  await run("/usr/bin/open", ["-b", target.bundleID]);
}

function isLayoutSummary(value: unknown): value is LayoutSummary {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt)) &&
    isCount(value.windowCount) &&
    isCount(value.appCount) &&
    isCount(value.displayCount)
  );
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
