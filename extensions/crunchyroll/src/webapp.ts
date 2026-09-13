// Helper to open Crunchyroll in the Safari web app with PiP

import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";

const WEB_APP_PATH = `${homedir()}/Applications/Crunchyroll Web.app`;

/**
 * Find the Crunchyroll Safari web app path, searching for any .app
 * in ~/Applications whose name contains "Crunchyroll" (case-insensitive).
 * Falls back to the default name if found.
 */
async function findWebAppPath(): Promise<string | null> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        set appsFolder to (path to applications folder from user domain) as string
        set foundPath to ""
        repeat with f in (every file of folder appsFolder whose name ends with ".app")
          set fName to name of f
          if fName contains "Crunchyroll" then
            set foundPath to (f as string)
            exit repeat
          end if
        end repeat
        return foundPath
      end tell
    `);
    if (!result) return null;
    // Convert HFS path to POSIX
    const posix = result
      .replace(/^file Macintosh HD:/, "/")
      .replace(/:$/, "")
      .replace(/:/g, "/");
    return posix;
  } catch {
    return null;
  }
}

/**
 * Check if the Crunchyroll Safari web app exists.
 * Searches for any app containing "Crunchyroll" in ~/Applications.
 */
export async function isWebAppInstalled(): Promise<boolean> {
  // First try the default path
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return exists file "${WEB_APP_PATH}"
      end tell
    `);
    if (result === "true") return true;
  } catch {
    // ignore
  }
  // Search for any Crunchyroll-named web app
  const found = await findWebAppPath();
  return found !== null;
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

/**
 * Safari web apps share one process called "Web App".
 * Check which web app is currently running by its file path.
 * Returns the path of the running web app, or null if none is running.
 */
async function getRunningWebAppPath(): Promise<string | null> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose name is "Web App")
        if (count of procList) > 0 then
          set p to item 1 of procList
          return (file of p) as string
        else
          return ""
        end if
      end tell
    `);
    if (!result) return null;
    // Convert "file Macintosh HD:Users:...:Crunchyroll Web.app:" to path
    const path = result
      .replace(/^file Macintosh HD:/, "/")
      .replace(/:$/, "")
      .replace(/:/g, "/");
    return path;
  } catch {
    return null;
  }
}

/**
 * Quit the running "Web App" process if it exists.
 */
async function quitWebApp(): Promise<void> {
  try {
    await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose name is "Web App")
        if (count of procList) > 0 then
          tell item 1 of procList
            set frontmost to true
          end tell
        end if
      end tell
      delay 0.5
      do shell script "pkill -x 'Web App'"
      delay 1
    `);
  } catch {
    // ignore — process might not exist
  }
}

/**
 * Open the Crunchyroll web app.
 * If Crunchyroll web app is already running, just focus the window.
 * If a different web app (e.g. YouTube) is running, quit it first.
 * Falls back to browser if web app is not installed.
 */
export async function openCrunchyroll(): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser("https://www.crunchyroll.com");
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  try {
    const runningPath = await getRunningWebAppPath();
    if (runningPath && runningPath.includes("Crunchyroll")) {
      // Same web app already running — just focus, don't reload
      await runAppleScript(`do shell script "open -a \\"${escapedPath}\\""`);
      return;
    }
    // Different web app or none running — quit if needed, then open
    if (runningPath) {
      await quitWebApp();
    }
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"https://www.crunchyroll.com\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch {
    await openInBrowser("https://www.crunchyroll.com");
  }
}

/**
 * Open the Crunchyroll web app and navigate to a URL.
 * Used by Search/Trending/History — always navigates to the URL.
 * If same app is running, navigates without restarting.
 * If different app is running, quits it first.
 * Falls back to browser if web app is not installed.
 */
export async function openCrunchyrollURL(url: string): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser(url);
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  try {
    const runningPath = await getRunningWebAppPath();
    if (runningPath && runningPath.includes("Crunchyroll")) {
      // Same web app already running — navigate to URL without restarting
      await runAppleScript(
        `do shell script "open -a \\"${escapedPath}\\" \\"${url}\\""`,
      );
      return;
    }
    // Different web app or none running — quit if needed, then open
    if (runningPath) {
      await quitWebApp();
    }
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"${url}\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch {
    await openInBrowser(url);
  }
}

/**
 * Trigger video fullscreen by sending the "f" key to the web app.
 * This is the standard HTML5 video player fullscreen shortcut on both
 * YouTube and Crunchyroll. If you use Vimium, add an exception for the
 * video site domain so "f" reaches the player instead of Vimium.
 */
export async function enterFullscreen(): Promise<void> {
  try {
    await runAppleScript(`
      tell application "System Events"
        set procList to (every process whose name is "Web App")
        if (count of procList) > 0 then
          tell item 1 of procList
            set frontmost to true
            delay 0.5
            keystroke "f"
          end tell
        end if
      end tell
    `);
  } catch {
    // ignore
  }
}

/**
 * Check if the Crunchyroll web app is currently running.
 */
export async function isCrunchyrollRunning(): Promise<boolean> {
  const runningPath = await getRunningWebAppPath();
  return runningPath !== null && runningPath.includes("Crunchyroll");
}

/**
 * Focus the Crunchyroll web app if it's already running.
 * If not running, open it with the given URL.
 * Used by Continue Watching — doesn't disrupt playback if already playing.
 */
export async function focusOrOpenCrunchyroll(url?: string): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser(url ?? "https://www.crunchyroll.com");
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  try {
    const runningPath = await getRunningWebAppPath();
    if (runningPath && runningPath.includes("Crunchyroll")) {
      // Same web app already running — just focus, don't reload
      await runAppleScript(`do shell script "open -a \\"${escapedPath}\\""`);
      return;
    }
    // Different web app or none running — quit if needed, then open with URL
    if (runningPath) {
      await quitWebApp();
    }
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"${url ?? "https://www.crunchyroll.com"}\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch {
    await openInBrowser(url ?? "https://www.crunchyroll.com");
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

/**
 * Fetch the most recent episode URL from Crunchyroll's history page.
 * Uses Safari JS to read the authenticated session's watch history.
 * Returns a /watch/ URL that auto-plays the episode.
 */
export async function fetchLastEpisodeUrl(): Promise<string | null> {
  const script = `
    tell application "Safari"
      if (count of windows) is 0 then
        make new document
      end if
      tell front window
        set histTab to (make new tab with properties {URL:"https://www.crunchyroll.com/history"})
      end tell
      tell application "System Events"
        tell process "Safari"
          set originalPos to position of front window
          set position of front window to {-2000, -2000}
        end tell
      end tell
      delay 5
      set jsResult to do JavaScript "
        (function(){
          var q = 'a[href*=' + String.fromCharCode(34) + '/watch/' + String.fromCharCode(34) + ']';
          var links = document.querySelectorAll(q);
          var seen = {};
          for (var i = 0; i < links.length; i++) {
            var href = links[i].href;
            if (seen[href]) continue;
            seen[href] = true;
            var text = links[i].textContent.trim();
            if (text.length > 2) return href;
          }
          for (var j = 0; j < links.length; j++) {
            if (links[j].href) return links[j].href;
          }
          return '';
        })();
      " in histTab
      close histTab
      tell application "System Events"
        tell process "Safari"
          set position of front window to originalPos
        end tell
      end tell
      return jsResult
    end tell
  `;
  try {
    const result = await runAppleScript(script);
    return result || null;
  } catch {
    return null;
  }
}
