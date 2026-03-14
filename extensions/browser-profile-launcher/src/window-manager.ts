import { exec } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import { basename } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// In-memory cache: windowId → profileDirectory
const windowProfileCache = new Map<string, string>();

function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export interface BrowserWindow {
  windowId: string;
  windowIndex: number;
  title: string;
  firstTabTitle: string;
  firstTabUrl: string;
  profileDirectory: string | null;
}

/**
 * Get all open windows for a browser with their first tab info.
 */
export async function getOpenWindows(browserName: string): Promise<BrowserWindow[]> {
  const escaped = escapeAppleScript(browserName);

  const script = `
    tell application "${escaped}"
      set output to ""
      set i to 1
      repeat with w in every window
        set firstTab to tab 1 of w
        set output to output & id of w & "|||" & i & "|||" & name of w & "|||" & title of firstTab & "|||" & URL of firstTab & linefeed
        set i to i + 1
      end repeat
      return output
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);

    const windows: BrowserWindow[] = [];
    for (const line of stdout.trim().split("\n")) {
      if (!line) continue;
      const parts = line.split("|||");
      if (parts.length >= 5) {
        const windowId = parts[0].trim();
        windows.push({
          windowId,
          windowIndex: parseInt(parts[1].trim(), 10),
          title: parts[2].trim(),
          firstTabTitle: parts[3].trim(),
          firstTabUrl: parts[4].trim(),
          profileDirectory: windowProfileCache.get(windowId) || null,
        });
      }
    }

    // Prune cache: remove entries for windows that no longer exist
    const currentIds = new Set(windows.map((w) => w.windowId));
    for (const cachedId of windowProfileCache.keys()) {
      if (!currentIds.has(cachedId)) {
        windowProfileCache.delete(cachedId);
      }
    }

    return windows;
  } catch {
    return [];
  }
}

/**
 * Probe only NEW windows (not in cache) to determine their profile.
 * Opens chrome://version in each unprobed window, saves the rendered HTML,
 * parses the Profile Path, then closes the tab and cleans up.
 */
export async function probeWindowProfiles(browserName: string, windows: BrowserWindow[]): Promise<BrowserWindow[]> {
  const unprobed = windows.filter((w) => w.profileDirectory === null);
  if (unprobed.length === 0) return windows;

  const escaped = escapeAppleScript(browserName);

  // Probe each unprobed window: open chrome://version, wait for load, save, close
  for (const win of unprobed) {
    const tmpFile = `/tmp/raycast_profile_probe_${win.windowId}.html`;

    // Single AppleScript per window: open tab, poll until loaded, save, close
    const probeScript = `
      tell application "${escaped}"
        set w to (first window whose id is "${win.windowId}")
        set t to make new tab at end of tabs of w with properties {URL:"chrome://version"}
        repeat 30 times
          if loading of t is false then exit repeat
          delay 0.1
        end repeat
        save t in "${tmpFile}" as "complete html"
        delay 0.2
        close t
      end tell
    `;

    try {
      await execAsync(`osascript -e '${probeScript.replace(/'/g, "'\\''")}'`);

      try {
        const html = readFileSync(tmpFile, "utf-8");
        const match = html.match(/id="profile_path">([^<]+)</);
        if (match) {
          const profileDir = basename(match[1].trim());
          win.profileDirectory = profileDir;
          windowProfileCache.set(win.windowId, profileDir);
        }
      } catch {
        // File might not exist if save failed
      }

      try {
        unlinkSync(tmpFile);
      } catch {
        // ignore
      }
    } catch {
      // AppleScript error for this window, skip
    }
  }

  return windows;
}

/**
 * Bring a specific window to the front using AXRaise via System Events.
 * Matches the window by its title.
 */
export async function focusWindowByTitle(browserName: string, windowTitle: string): Promise<boolean> {
  const escapedApp = escapeAppleScript(browserName);
  const escapedTitle = escapeAppleScript(windowTitle);

  const script = `
    tell application "${escapedApp}" to activate
    tell application "System Events"
      tell process "${escapedApp}"
        repeat with w in every window
          if name of w is "${escapedTitle}" then
            perform action "AXRaise" of w
            return "ok"
          end if
        end repeat
      end tell
    end tell
  `;

  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    return true;
  } catch {
    try {
      await execAsync(`osascript -e 'tell application "${escapedApp}" to activate'`);
    } catch {
      // ignore
    }
    return false;
  }
}

export async function isProcessRunning(processName: string): Promise<boolean> {
  try {
    await execAsync(`pgrep -x "${processName}"`);
    return true;
  } catch {
    return false;
  }
}
