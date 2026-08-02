import { closeMainWindow, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { exec, spawn } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { Preferences, Tab } from "../interfaces";
import { SEARCH_ENGINE } from "../constants";

const execAsync = promisify(exec);

const WINDOWS_FIREFOX_PATHS: Record<string, string[]> = {
  Firefox: ["C:\\Program Files\\Mozilla Firefox\\firefox.exe", "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe"],
  "Firefox Nightly": [
    "C:\\Program Files\\Firefox Nightly\\firefox.exe",
    "C:\\Program Files (x86)\\Firefox Nightly\\firefox.exe",
  ],
  "Firefox ESR": [
    "C:\\Program Files\\Mozilla Firefox ESR\\firefox.exe",
    "C:\\Program Files (x86)\\Mozilla Firefox ESR\\firefox.exe",
  ],
  "Firefox Developer Edition": [
    "C:\\Program Files\\Firefox Developer Edition\\firefox.exe",
    "C:\\Program Files (x86)\\Firefox Developer Edition\\firefox.exe",
  ],
};

function getWindowsFirefoxExe(browserApp: string): string {
  const candidates = WINDOWS_FIREFOX_PATHS[browserApp] ?? WINDOWS_FIREFOX_PATHS["Firefox"];
  return candidates.find(existsSync) ?? "firefox.exe";
}

/**
 * Spawns Firefox as a detached, independent process on Windows.
 * Resolves once the child process has started successfully, or rejects
 * with a descriptive error if the executable cannot be launched.
 */
function spawnFirefoxWindows(exe: string, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [url], { detached: true, stdio: "ignore" });
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

export async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  const searchEngine = getPreferenceValues<Preferences>().searchEngine?.toLowerCase() || "google";
  const url = queryText
    ? `${SEARCH_ENGINE[searchEngine] ?? SEARCH_ENGINE["google"]}${encodeURIComponent(queryText)}`
    : "about:newtab";

  try {
    await launchFirefox(url, getBrowserApp());
    popToRoot();
    closeMainWindow({ clearRootSearch: true });
    return "success";
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open Firefox", message: String(err) });
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
    await showToast({ style: Toast.Style.Failure, title: "Failed to open Firefox", message: String(err) });
    return "error";
  }
}

export async function setActiveTab(tab: Tab): Promise<void> {
  try {
    // Instead of trying to find and activate the existing tab,
    // just open the URL which is more reliable and simpler
    await launchFirefox(tab.url, getBrowserApp());
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open Firefox", message: String(err) });
  }
}
