import {
  BrowserExtension,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { Device, FORMATS, ImageFormat, Screenshot, SnapRenderClient, SnapRenderError, fileExtension } from "./api";

const KEEP_RECENT_FILES = 20;

export function getClient(): SnapRenderClient {
  const { apiKey } = getPreferenceValues<Preferences>();
  return new SnapRenderClient({ apiKey });
}

export function getDefaults(): { format: ImageFormat; device: Device | "desktop" } {
  const { defaultFormat, defaultDevice } = getPreferenceValues<Preferences>();
  const format = FORMATS.includes(defaultFormat as ImageFormat) ? (defaultFormat as ImageFormat) : "png";
  return { format, device: (defaultDevice as Device | "desktop") || "desktop" };
}

/** Chromium browsers that answer the same AppleScript, keyed by bundle ID. */
const CHROMIUM_BROWSERS: Record<string, string> = {
  "com.google.Chrome": "Google Chrome",
  "com.google.Chrome.beta": "Google Chrome Beta",
  "com.google.Chrome.canary": "Google Chrome Canary",
  "com.brave.Browser": "Brave Browser",
  "com.microsoft.edgemac": "Microsoft Edge",
  "company.thebrowser.Browser": "Arc",
  "com.vivaldi.Vivaldi": "Vivaldi",
  "org.chromium.Chromium": "Chromium",
};
const SAFARI_BROWSERS: Record<string, string> = {
  "com.apple.Safari": "Safari",
  "com.apple.SafariTechnologyPreview": "Safari Technology Preview",
};

function isWebUrl(value: string | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

async function urlFromAppleScript(): Promise<string | undefined> {
  const app = await getFrontmostApplication();
  const bundleId = app.bundleId ?? "";
  let script: string | undefined;
  if (CHROMIUM_BROWSERS[bundleId]) {
    script = `tell application "${CHROMIUM_BROWSERS[bundleId]}" to return URL of active tab of front window`;
  } else if (SAFARI_BROWSERS[bundleId]) {
    script = `tell application "${SAFARI_BROWSERS[bundleId]}" to return URL of front document`;
  }
  if (!script) return undefined;
  const url = (await runAppleScript(script, { timeout: 3000 })).trim();
  return isWebUrl(url) ? url : undefined;
}

/**
 * The URL of the active tab in the frontmost browser. Uses the Raycast Browser Extension when it is installed and
 * falls back to AppleScript for Safari and Chromium browsers. Returns undefined when no web page is open.
 */
export async function getActiveTabUrl(): Promise<string | undefined> {
  if (environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const active = tabs.find((tab) => tab.active && isWebUrl(tab.url));
      if (active) return active.url;
    } catch {
      // The browser extension is not installed or not connected: try AppleScript next.
    }
  }
  try {
    return await urlFromAppleScript();
  } catch {
    return undefined;
  }
}

function slugFor(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").replace(/[^a-z0-9.-]/gi, "-");
  } catch {
    return "page";
  }
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+$/, "");
}

/** A file name that is unique per capture: host, time to the second and a random suffix. */
export function screenshotFileName(url: string, format: ImageFormat): string {
  return `snaprender-${slugFor(url)}-${timestamp()}-${randomBytes(3).toString("hex")}.${fileExtension(format)}`;
}

/** Writes the screenshot to the extension's support folder, keeping only the most recent files. */
export async function saveToSupport(url: string, shot: Screenshot): Promise<string> {
  const dir = path.join(environment.supportPath, "screenshots");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, screenshotFileName(url, shot.format));
  await writeFile(filePath, shot.data, { flag: "wx" });
  await pruneOldFiles(dir);
  return filePath;
}

async function pruneOldFiles(dir: string): Promise<void> {
  try {
    const names = await readdir(dir);
    const files = await Promise.all(
      names.map(async (name) => ({ name, time: (await stat(path.join(dir, name))).mtimeMs })),
    );
    files.sort((a, b) => b.time - a.time);
    await Promise.all(files.slice(KEEP_RECENT_FILES).map((file) => unlink(path.join(dir, file.name))));
  } catch {
    // Cleanup is best effort.
  }
}

/** Number of numbered names to try before giving up on a crowded Downloads folder. */
const MAX_NAME_ATTEMPTS = 1000;

/**
 * Reserves a free name in ~/Downloads by creating the file exclusively, so two saves that overlap can never pick the
 * same name. `create` receives the candidate path and must fail with EEXIST when the file is already there.
 */
async function createInDownloads(fileName: string, create: (target: string) => Promise<void>): Promise<string> {
  const downloads = path.join(homedir(), "Downloads");
  await mkdir(downloads, { recursive: true });
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  for (let i = 1; i <= MAX_NAME_ATTEMPTS; i++) {
    const target = path.join(downloads, i === 1 ? fileName : `${base}-${i}${ext}`);
    try {
      await create(target);
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Could not find a free file name in Downloads");
}

/** Copies a file into ~/Downloads without overwriting an existing file. Returns the new path. */
export async function copyToDownloads(filePath: string): Promise<string> {
  return createInDownloads(path.basename(filePath), (target) => copyFile(filePath, target, constants.COPYFILE_EXCL));
}

/** Writes raw bytes to ~/Downloads without overwriting an existing file. Returns the new path. */
export async function writeToDownloads(fileName: string, data: Buffer): Promise<string> {
  return createInDownloads(fileName, (target) => writeFile(target, data, { flag: "wx" }));
}

export function errorMessage(error: unknown): string {
  if (error instanceof SnapRenderError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Shows a failure toast. Auth errors get an action that opens the extension preferences. */
export async function showError(title: string, error: unknown): Promise<void> {
  const isAuth = error instanceof SnapRenderError && error.isAuthError;
  await showFailureToast(error, {
    title,
    message: errorMessage(error),
    primaryAction: isAuth
      ? {
          title: "Open Extension Preferences",
          onAction: () => {
            openExtensionPreferences();
          },
        }
      : undefined,
  });
}
