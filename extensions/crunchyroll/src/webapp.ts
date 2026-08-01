// Helper to open Crunchyroll in the Safari web app with PiP

import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";

const WEB_APP_PATH = `${homedir()}/Applications/Crunchyroll Web.app`;

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

/**
 * Safari web apps share one process called "Web App".
 * Quit it before opening a different web app to avoid conflicts.
 */
async function quitExistingWebApp(): Promise<void> {
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
 * Quits any existing web app (e.g. YouTube) first to avoid conflicts.
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
    await quitExistingWebApp();
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
 * Quits any existing web app first. Falls back to browser.
 */
export async function openCrunchyrollURL(url: string): Promise<void> {
  const installed = await isWebAppInstalled();
  if (!installed) {
    await openInBrowser(url);
    return;
  }

  const escapedPath = WEB_APP_PATH.replace(/"/g, '\\"');
  try {
    await quitExistingWebApp();
    await runAppleScript(
      `do shell script "open -a \\"${escapedPath}\\" \\"${url}\\""`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
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
