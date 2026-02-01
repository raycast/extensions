import { showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";

const execAsync = promisify(exec);

// Safari cache directories
const TOUCH_ICONS_CACHE = join(homedir(), "Library/Safari/Touch Icons Cache");
const TOUCH_ICONS_IMAGES = join(TOUCH_ICONS_CACHE, "Images");
const FAVICON_CACHE = join(homedir(), "Library/Safari/Favicon Cache");
const FAVICON_DB = join(FAVICON_CACHE, "favicons.db");
const FAVICON_IMAGES = join(FAVICON_CACHE, "favicons");

// AppleScript to get the current Safari tab URL
const GET_SAFARI_URL_SCRIPT = `
tell application "Safari"
  if (count of windows) > 0 then
    if (count of tabs of front window) > 0 then
      return URL of current tab of front window
    end if
  end if
  return ""
end tell
`;

// AppleScript to quit Safari
const QUIT_SAFARI_SCRIPT = `
tell application "Safari"
  quit
end tell
`;

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execAsync(
    `osascript -e '${script.replace(/'/g, "'\"'\"'")}'`,
  );
  return stdout.trim();
}

/**
 * Calculate MD5 hash of a string (uppercase, matching Safari's format)
 */
function md5(str: string): string {
  return createHash("md5").update(str).digest("hex").toUpperCase();
}

/**
 * Parse URL to extract host info
 */
function parseUrl(
  url: string,
): { hostOnly: string; hostWithPort: string } | null {
  try {
    const urlObj = new URL(url);
    const hostWithPort = urlObj.port
      ? `${urlObj.hostname}:${urlObj.port}`
      : urlObj.hostname;
    return {
      hostOnly: urlObj.hostname.toLowerCase(),
      hostWithPort: hostWithPort.toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Delete Touch Icon (Start Page favicon) using MD5 hash of domain
 */
function deleteTouchIcon(hostOnly: string): boolean {
  if (!existsSync(TOUCH_ICONS_IMAGES)) {
    return false;
  }

  const hash = md5(hostOnly);
  const iconPath = join(TOUCH_ICONS_IMAGES, `${hash}.png`);

  if (existsSync(iconPath)) {
    try {
      unlinkSync(iconPath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Clear Favicon Cache (Tab Bar) entries using SQLite
 */
async function clearFaviconCache(hostWithPort: string): Promise<void> {
  if (!existsSync(FAVICON_DB)) {
    return;
  }

  const pattern = `%${hostWithPort}%`;
  const dbPath = FAVICON_DB.replace(/'/g, "'\"'\"'");

  try {
    // Get UUIDs and icon URLs for entries matching the host
    const selectCmd = `sqlite3 '${dbPath}' "SELECT DISTINCT p.uuid, i.url FROM page_url p LEFT JOIN icon_info i ON p.uuid = i.uuid WHERE p.url LIKE '${pattern}';"`;
    const { stdout } = await execAsync(selectCmd);

    const uuidsToDelete: Set<string> = new Set();
    const iconURLsToDelete: Set<string> = new Set();

    for (const line of stdout.trim().split("\n")) {
      if (!line) continue;
      const parts = line.split("|");
      if (parts[0]) uuidsToDelete.add(parts[0]);
      if (parts[1]) iconURLsToDelete.add(parts[1]);
    }

    // Delete from page_url table
    await execAsync(
      `sqlite3 '${dbPath}' "DELETE FROM page_url WHERE url LIKE '${pattern}';"`,
    ).catch(() => {});

    // Delete from icon_info table
    for (const uuid of uuidsToDelete) {
      await execAsync(
        `sqlite3 '${dbPath}' "DELETE FROM icon_info WHERE uuid = '${uuid}';"`,
      ).catch(() => {});
    }

    // Delete from rejected_resources table
    await execAsync(
      `sqlite3 '${dbPath}' "DELETE FROM rejected_resources WHERE page_url LIKE '${pattern}';"`,
    ).catch(() => {});

    // Delete actual favicon files
    for (const iconURL of iconURLsToDelete) {
      const hash = md5(iconURL);
      const faviconPath = join(FAVICON_IMAGES, hash);
      if (existsSync(faviconPath)) {
        try {
          unlinkSync(faviconPath);
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // SQLite operations failed, likely permission issue
  }
}

async function isSafariRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("pgrep -x Safari");
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function waitForSafariToQuit(maxWaitMs = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (!(await isSafariRunning())) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

export default async function Command() {
  try {
    // Check if Safari is running
    if (!(await isSafariRunning())) {
      await showHUD("Safari is not running");
      return;
    }

    // Get current Safari URL
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting Safari URL...",
    });
    const url = await runAppleScript(GET_SAFARI_URL_SCRIPT);

    if (!url) {
      await showHUD("No URL found in Safari");
      return;
    }

    const parsed = parseUrl(url);
    if (!parsed) {
      await showHUD("Could not parse URL");
      return;
    }

    const { hostOnly, hostWithPort } = parsed;

    // Quit Safari
    await showToast({
      style: Toast.Style.Animated,
      title: "Quitting Safari...",
    });
    await runAppleScript(QUIT_SAFARI_SCRIPT);

    // Wait for Safari to quit
    const safariQuit = await waitForSafariToQuit();
    if (!safariQuit) {
      await showHUD("Failed to quit Safari");
      return;
    }

    // Small delay to ensure file handles are released
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Delete favicon from caches
    await showToast({
      style: Toast.Style.Animated,
      title: "Clearing favicon cache...",
    });

    // Delete Touch Icon (Start Page) using MD5 hash
    deleteTouchIcon(hostOnly);

    // Clear Favicon Cache (Tab Bar) using SQLite
    await clearFaviconCache(hostWithPort);

    // Reopen Safari
    await showToast({
      style: Toast.Style.Animated,
      title: "Reopening Safari...",
    });
    await execAsync("open -a Safari");

    // Show success message
    await showHUD(`Refreshed favicon for ${hostOnly}`);
  } catch (error) {
    console.error("Error:", error);
    await showHUD(
      "Failed to refresh favicon. Check Full Disk Access permission.",
    );
  }
}
