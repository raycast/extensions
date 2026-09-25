import { closeMainWindow, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { exec, spawn } from "child_process";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { Tab } from "../interfaces";
import { SEARCH_ENGINE } from "../constants";

const execAsync = promisify(exec);

const RELEASE_VARIANT = "Firefox";

const WINDOWS_FIREFOX_FOLDERS: Record<string, string> = {
  Firefox: "Mozilla Firefox",
  "Firefox Nightly": "Firefox Nightly",
  "Firefox ESR": "Mozilla Firefox ESR",
  "Firefox Developer Edition": "Firefox Developer Edition",
};

function windowsFirefoxCandidates(browserApp: string): string[] {
  const folder = WINDOWS_FIREFOX_FOLDERS[browserApp] ?? WINDOWS_FIREFOX_FOLDERS[RELEASE_VARIANT];
  const exe = "firefox.exe";
  const localAppData = process.env.LOCALAPPDATA ?? path.win32.join(os.homedir(), "AppData", "Local");
  return [
    path.win32.join("C:\\Program Files", folder, exe),
    path.win32.join("C:\\Program Files (x86)", folder, exe),
    path.win32.join(localAppData, folder, exe),
    path.win32.join(localAppData, "Programs", folder, exe),
  ];
}

/**
 * Resolves the Firefox executable path for the given variant on Windows.
 * Only paths confirmed with existsSync are returned. An unverified "firefox.exe"
 * PATH fallback is never used — it caused ENOENT when Firefox was off PATH,
 * and for non-release variants it could silently launch Release instead.
 */
function getWindowsFirefoxExe(browserApp: string): string {
  const resolved = windowsFirefoxCandidates(browserApp).find(existsSync);
  if (resolved) return resolved;

  throw new Error(
    `${browserApp} was not found. Please verify it is installed, or change the Firefox Application preference.`,
  );
}

/**
 * Spawns Firefox as a detached, independent process on Windows.
 * Resolves once the child process has started successfully, or rejects
 * with a descriptive error if the executable cannot be launched.
 */
function spawnFirefoxWindows(exe: string, url: string, extraArgs: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [...extraArgs, url], { detached: true, stdio: "ignore" });
    child.once("spawn", () => {
      child.unref(); // let Firefox live independently of the Raycast process
      resolve();
    });
    child.once("error", reject);
  });
}

/**
 * Opens a URL in the configured Firefox variant, handling both Windows and macOS.
 */
async function launchFirefox(url: string, browserApp: string): Promise<void> {
  if (process.platform === "win32") {
    await spawnFirefoxWindows(getWindowsFirefoxExe(browserApp), url);
  } else {
    await execAsync(`open -a "${browserApp}" "${url}"`);
  }
}

function getBrowserApp(): string {
  return getPreferenceValues<Preferences>().browserApp || "Firefox";
}

async function showLaunchError(err: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Failed to open Firefox",
    message: err instanceof Error ? err.message : String(err),
  });
}

export function buildNewTabUrl(queryText: string | null | undefined): string {
  const searchEngine = getPreferenceValues<Preferences.NewTab>().searchEngine?.toLowerCase() || "google";
  return queryText
    ? `${SEARCH_ENGINE[searchEngine] ?? SEARCH_ENGINE["google"]}${encodeURIComponent(queryText)}`
    : "about:newtab";
}

export async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  const url = buildNewTabUrl(queryText);

  try {
    await launchFirefox(url, getBrowserApp());
    popToRoot();
    closeMainWindow({ clearRootSearch: true });
    return "success";
  } catch (err) {
    await showLaunchError(err);
    return "error";
  }
}

const NEW_WINDOW_FLAG = "-new-window";
const EMPTY_TAB_DESTINATION = "about:newtab";

export async function openInNewWindow(url: string | null | undefined): Promise<boolean | string> {
  const destination = url?.trim() || EMPTY_TAB_DESTINATION;

  try {
    await spawnFirefoxWindows(getWindowsFirefoxExe(getBrowserApp()), destination, [NEW_WINDOW_FLAG]);
    popToRoot();
    closeMainWindow({ clearRootSearch: true });
    return "success";
  } catch (err) {
    await showLaunchError(err);
    return "error";
  }
}

export async function openHistoryTab(url: string): Promise<boolean | string> {
  try {
    await launchFirefox(url, getBrowserApp());
    popToRoot();
    closeMainWindow({ clearRootSearch: true });
    return "success";
  } catch (err) {
    await showLaunchError(err);
    return "error";
  }
}

export async function setActiveTab(tab: Tab): Promise<void> {
  try {
    // Instead of trying to find and activate the existing tab,
    // just open the URL which is more reliable and simpler
    await launchFirefox(tab.url, getBrowserApp());
  } catch (err) {
    await showLaunchError(err);
  }
}
