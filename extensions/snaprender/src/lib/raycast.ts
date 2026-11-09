import {
  BrowserExtension,
  Toast,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { existsSync } from "node:fs";
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

export function screenshotFileName(url: string, format: ImageFormat): string {
  return `snaprender-${slugFor(url)}-${timestamp()}.${fileExtension(format)}`;
}

/** Writes the screenshot to the extension's support folder, keeping only the most recent files. */
export async function saveToSupport(url: string, shot: Screenshot): Promise<string> {
  const dir = path.join(environment.supportPath, "screenshots");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, screenshotFileName(url, shot.format));
  await writeFile(filePath, shot.data);
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

/** Copies a file into ~/Downloads without overwriting an existing file. Returns the new path. */
export async function copyToDownloads(filePath: string): Promise<string> {
  const downloads = path.join(homedir(), "Downloads");
  await mkdir(downloads, { recursive: true });
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  let target = path.join(downloads, `${base}${ext}`);
  for (let i = 2; existsSync(target); i++) target = path.join(downloads, `${base}-${i}${ext}`);
  await copyFile(filePath, target);
  return target;
}

/** Writes raw bytes to ~/Downloads without overwriting an existing file. Returns the new path. */
export async function writeToDownloads(fileName: string, data: Buffer): Promise<string> {
  const downloads = path.join(homedir(), "Downloads");
  await mkdir(downloads, { recursive: true });
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let target = path.join(downloads, fileName);
  for (let i = 2; existsSync(target); i++) target = path.join(downloads, `${base}-${i}${ext}`);
  await writeFile(target, data);
  return target;
}

export function errorMessage(error: unknown): string {
  if (error instanceof SnapRenderError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Shows a failure toast. Auth errors get an action that opens the extension preferences. */
export async function showError(title: string, error: unknown): Promise<void> {
  const isAuth = error instanceof SnapRenderError && error.isAuthError;
  await showToast({
    style: Toast.Style.Failure,
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
