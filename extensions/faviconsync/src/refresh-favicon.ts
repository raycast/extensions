import { showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

// Safari cache directories
const TOUCH_ICONS_CACHE = join(homedir(), "Library/Safari/Touch Icons Cache");
const FAVICON_CACHE = join(homedir(), "Library/Safari/Favicon Cache");

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

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

function deleteFaviconFromCache(cacheDir: string, domain: string): number {
  let deletedCount = 0;

  if (!existsSync(cacheDir)) {
    return 0;
  }

  const entries = readdirSync(cacheDir);

  for (const entry of entries) {
    const entryPath = join(cacheDir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      // Check files inside subdirectories
      const subEntries = readdirSync(entryPath);
      for (const subEntry of subEntries) {
        if (subEntry.toLowerCase().includes(domain.toLowerCase())) {
          const filePath = join(entryPath, subEntry);
          try {
            unlinkSync(filePath);
            deletedCount++;
          } catch {
            // Ignore errors
          }
        }
      }
    } else if (entry.toLowerCase().includes(domain.toLowerCase())) {
      try {
        unlinkSync(entryPath);
        deletedCount++;
      } catch {
        // Ignore errors
      }
    }
  }

  return deletedCount;
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

    const domain = extractDomain(url);
    if (!domain) {
      await showHUD("Could not extract domain from URL");
      return;
    }

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
    deleteFaviconFromCache(TOUCH_ICONS_CACHE, domain);
    deleteFaviconFromCache(FAVICON_CACHE, domain);

    // Reopen Safari
    await showToast({
      style: Toast.Style.Animated,
      title: "Reopening Safari...",
    });
    await execAsync("open -a Safari");

    // Show success message
    await showHUD(`Refreshed favicon for ${domain}`);
  } catch (error) {
    console.error("Error:", error);
    await showHUD(
      "Failed to refresh favicon. Check Full Disk Access permission.",
    );
  }
}
