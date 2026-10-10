import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";
import {
  Application,
  getApplications,
  getDefaultApplication,
  open,
} from "@raycast/api";
import { TableProNotInstalledError, UpdateRequiredError } from "./types";

export const BUNDLE_ID = "com.TablePro";
export const MIN_TABLEPRO_VERSION = "0.37.0";

const execFileAsync = promisify(execFile);

let tableProPromise: Promise<Application | undefined> | null = null;
const versionByPath = new Map<string, Promise<string | undefined>>();

function isTableProBundle(app: Application): boolean {
  return app.bundleId?.toLowerCase() === BUNDLE_ID.toLowerCase();
}

async function locateTablePro(): Promise<Application | undefined> {
  const matches = (await getApplications()).filter(isTableProBundle);
  if (matches.length <= 1) return matches[0];
  // Dev builds share the bundle ID; prefer the copy that handles tablepro:// links.
  const handler = await getDefaultApplication("tablepro://").catch(
    () => undefined,
  );
  return matches.find((app) => app.path === handler?.path) ?? matches[0];
}

export function findTablePro(): Promise<Application | undefined> {
  if (tableProPromise) return tableProPromise;
  const promise = locateTablePro();
  tableProPromise = promise;
  promise.then(
    (app) => {
      if (!app && tableProPromise === promise) tableProPromise = null;
    },
    () => {
      if (tableProPromise === promise) tableProPromise = null;
    },
  );
  return promise;
}

export async function requireTablePro(): Promise<Application> {
  const app = await findTablePro();
  if (!app) throw new TableProNotInstalledError();
  return app;
}

async function readBundleVersion(appPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      "-o",
      "-",
      join(appPath, "Contents", "Info.plist"),
    ]);
    const version = stdout.trim();
    return version === "" ? undefined : version;
  } catch {
    return undefined;
  }
}

export function installedVersion(
  app: Application,
): Promise<string | undefined> {
  const cached = versionByPath.get(app.path);
  if (cached) return cached;
  const promise = readBundleVersion(app.path);
  versionByPath.set(app.path, promise);
  return promise;
}

function versionParts(version: string): number[] {
  return version
    .split(/[-+]/)[0]!
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

export function compareVersions(a: string, b: string): number {
  const left = versionParts(a);
  const right = versionParts(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function assertSupportedVersion(version: string | undefined): void {
  if (version === undefined) return;
  if (compareVersions(version, MIN_TABLEPRO_VERSION) < 0) {
    throw new UpdateRequiredError(MIN_TABLEPRO_VERSION, version);
  }
}

export async function assertInstalledVersionSupported(
  app: Application,
): Promise<void> {
  assertSupportedVersion(await installedVersion(app));
}

export async function openInTablePro(url: string): Promise<void> {
  await open(url, BUNDLE_ID);
}

export async function launchTablePro(): Promise<void> {
  const app = await requireTablePro();
  await open(app.path);
}
