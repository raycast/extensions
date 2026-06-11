import type { Application } from "@raycast/api";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const RAYCAST_BUNDLE_IDS = new Set(["com.raycast.macos"]);
const RAYCAST_NAMES = new Set(["raycast"]);

interface WebUrlCapabilityOptions {
  platform?: NodeJS.Platform;
  readInfoPlistJson?: (plistPath: string) => Promise<string>;
}

interface ActiveBrowserAfterRaycastClosesOptions {
  getFrontmostApplication: () => Promise<Application>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
  intervalMs?: number;
  canOpenWebUrls?: (application: Application) => Promise<boolean>;
}

interface InfoPlist {
  CFBundleURLTypes?: Array<{
    CFBundleURLSchemes?: unknown;
  }>;
}

export async function canApplicationOpenWebUrls(
  application: Application,
  {
    platform = process.platform,
    readInfoPlistJson = readInfoPlistJsonWithPlutil,
  }: WebUrlCapabilityOptions = {},
): Promise<boolean> {
  if (platform !== "darwin" || !application.path.endsWith(".app")) {
    return false;
  }

  try {
    const plistPath = join(application.path, "Contents", "Info.plist");
    const plist = JSON.parse(await readInfoPlistJson(plistPath)) as InfoPlist;
    return (
      plist.CFBundleURLTypes?.some((urlType) => {
        const schemes = urlType.CFBundleURLSchemes;
        return (
          Array.isArray(schemes) &&
          schemes.some(
            (scheme) =>
              typeof scheme === "string" &&
              ["http", "https"].includes(scheme.toLowerCase()),
          )
        );
      }) === true
    );
  } catch {
    return false;
  }
}

export async function filterWebUrlApplications(
  applications: Application[],
  canOpenWebUrls = canApplicationOpenWebUrls,
): Promise<Application[]> {
  const results = await Promise.all(
    applications.map(async (application) => ({
      application,
      canOpen: await canOpenWebUrls(application),
    })),
  );

  return results
    .filter((result) => result.canOpen)
    .map((result) => result.application);
}

export function isRaycastApplication(application: Application): boolean {
  const bundleId = application.bundleId?.toLowerCase();
  if (bundleId && RAYCAST_BUNDLE_IDS.has(bundleId)) {
    return true;
  }

  const name = application.name.toLowerCase();
  if (RAYCAST_NAMES.has(name)) {
    return true;
  }

  const pathName = application.path
    .split("/")
    .pop()
    ?.replace(/\.app$/i, "")
    .toLowerCase();

  return pathName ? RAYCAST_NAMES.has(pathName) : false;
}

export async function getActiveBrowserAfterRaycastCloses({
  getFrontmostApplication,
  sleep = delay,
  now = () => Date.now(),
  timeoutMs = 500,
  intervalMs = 50,
  canOpenWebUrls = canApplicationOpenWebUrls,
}: ActiveBrowserAfterRaycastClosesOptions): Promise<Application | null> {
  const startedAt = now();
  let elapsedMs = 0;

  while (elapsedMs <= timeoutMs) {
    const application = await getFrontmostApplication().catch(() => null);
    if (application && !isRaycastApplication(application)) {
      return (await canOpenWebUrls(application)) ? application : null;
    }

    if (elapsedMs >= timeoutMs) {
      return null;
    }

    await sleep(intervalMs);
    elapsedMs = now() - startedAt;
  }

  return null;
}

export function getUrlOpenApplication({
  activeBrowser,
  configuredBrowser,
}: {
  activeBrowser?: Application | null;
  configuredBrowser?: string;
}): Application | string | undefined {
  if (activeBrowser) {
    return activeBrowser;
  }

  return configuredBrowser;
}

export function shouldResolveActiveBrowser(
  url: string,
  openUrlsInActiveBrowser: boolean | undefined,
): boolean {
  return Boolean(openUrlsInActiveBrowser) && !url.startsWith("raycast://");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readInfoPlistJsonWithPlutil(plistPath: string): Promise<string> {
  const { stdout } = await execFileAsync("plutil", [
    "-convert",
    "json",
    "-o",
    "-",
    plistPath,
  ]);
  return stdout;
}
