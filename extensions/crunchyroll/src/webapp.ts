// Helper to open Crunchyroll in the Safari web app with PiP

import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";

const WEB_APP_PATH = `${homedir()}/Applications/Crunchyroll Web.app`;
let webAppBundleId = "";

async function detectWebAppBundleId(): Promise<string> {
  if (webAppBundleId) return webAppBundleId;
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        try
          set bundleId to bundle identifier of file "${WEB_APP_PATH}"
          return bundleId
        end try
      end tell
      return ""
    `);
    webAppBundleId = result;
    return result;
  } catch {
    return "";
  }
}

/**
 * Check if the Crunchyroll Safari web app exists
 */
export async function isWebAppInstalled(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return exists file "${WEB_APP_PATH}"
      end tell
    `);
    return result === "true";
  } catch {
    return false;
  }
}

/**
 * Create the Crunchyroll Safari web app if it doesn't exist
 */
export async function createWebApp(): Promise<void> {
  await runAppleScript(`
    -- Launch Safari if not running
    tell application "System Events"
      if not (exists process "Safari") then
        do shell script "open -a Safari"
        delay 3
      end if
    end tell

    tell application "Safari"
      activate
      delay 1
      if (count of windows) is 0 then
        make new document with properties {URL:"https://www.crunchyroll.com"}
      else
        tell front window
          set current tab to (make new tab with properties {URL:"https://www.crunchyroll.com"})
        end tell
      end if
    end tell

    delay 5

    tell application "System Events"
      tell process "Safari"
        click menu item "Add to Dock…" of menu "File" of menu bar item "File" of menu bar 1
      end tell
    end tell
  `);
}

async function openInBrowser(url: string): Promise<void> {
  await runAppleScript(`do shell script "open \\"${url}\\""`);
}

async function bringToFront(bundleId: string, autoPlay = false): Promise<void> {
  await runAppleScript(`
    tell application "System Events"
      set procList to (every process whose bundle identifier is "${bundleId}")
      if (count of procList) > 0 then
        tell item 1 of procList
          set frontmost to true
        end tell
      end if
    end tell
  `);
  if (autoPlay) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose bundle identifier is "${bundleId}")
        if (count of procList) > 0 then
          tell item 1 of procList
            keystroke space
          end tell
        end if
      end tell
    `);
  }
}

/**
 * Open the Crunchyroll web app (resumes last watched page).
 * Falls back to browser if web app is not installed.
 */
export async function openCrunchyroll(): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser("https://www.crunchyroll.com");
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  const bundleId = await detectWebAppBundleId();
  try {
    await runAppleScript(`do shell script "open -a \\"${escapedPath}\\""`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (bundleId) {
      await bringToFront(bundleId, true);
    }
  } catch {
    await openInBrowser("https://www.crunchyroll.com");
  }
}

/**
 * Open the Crunchyroll web app and navigate to a URL.
 * Falls back to browser if web app is not installed.
 */
export async function openCrunchyrollURL(url: string): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser(url);
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  const bundleId = await detectWebAppBundleId();
  try {
    await runAppleScript(`do shell script "open -a \\"${escapedPath}\\""`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (bundleId) {
      await runAppleScript(`
        tell application id "${bundleId}"
          open location "${url}"
        end tell
      `);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await bringToFront(bundleId);
    }
  } catch {
    await openInBrowser(url);
  }
}

/**
 * Check if the AutoPiP Safari extension is installed
 */
export async function isAutoPiPInstalled(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return exists file "/Applications/AutoPiP.app"
      end tell
    `);
    return result === "true";
  } catch {
    return false;
  }
}
