import { exec, execFile } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// In-memory cache: windowId → profileDirectory
const windowProfileCache = new Map<string, string>();

function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export interface BrowserWindow {
  windowId: string;
  windowIndex: number;
  title: string;
  tabUrls: string[];
  profileDirectory: string | null;
}

/**
 * Get all open windows for a browser with all tab URLs.
 */
export async function getOpenWindows(browserName: string): Promise<BrowserWindow[]> {
  const escaped = escapeAppleScript(browserName);

  const script = `
    tell application "${escaped}"
      set output to ""
      set i to 1
      repeat with w in every window
        set tabUrls to ""
        repeat with t in every tab of w
          set tabUrls to tabUrls & URL of t & ":::"
        end repeat
        set output to output & id of w & "|||" & i & "|||" & name of w & "|||" & tabUrls & linefeed
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
      if (parts.length >= 4) {
        const windowId = parts[0].trim();
        const tabUrlsRaw = parts[3].trim();
        const tabUrls = tabUrlsRaw
          .split(":::")
          .map((u) => u.trim())
          .filter((u) => u.length > 0);
        windows.push({
          windowId,
          windowIndex: parseInt(parts[1].trim(), 10),
          title: parts[2].trim(),
          tabUrls,
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
 * Extract URLs from a binary SNSS session file using the `strings` command.
 */
async function extractUrlsFromSessionFile(filePath: string): Promise<Set<string>> {
  try {
    const { stdout } = await execFileAsync("strings", [filePath]);
    const urls = new Set<string>();
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        urls.add(trimmed);
      }
    }
    return urls;
  } catch {
    return new Set();
  }
}

/**
 * Find the most recent session file in a profile's Sessions directory.
 * Looks for autosave.bin, backup.bin, or Tabs_* files.
 */
function findSessionFile(profilePath: string): string | null {
  const sessionsDir = join(profilePath, "Sessions");
  if (!existsSync(sessionsDir)) return null;

  // Prefer autosave.bin > backup.bin > most recent Tabs_* file
  const autosave = join(sessionsDir, "autosave.bin");
  if (existsSync(autosave)) return autosave;

  const backup = join(sessionsDir, "backup.bin");
  if (existsSync(backup)) return backup;

  // Fall back to most recent Tabs_* or Session_* file
  try {
    const files = readdirSync(sessionsDir)
      .filter((f) => f.startsWith("Tabs_") || f.startsWith("Session_"))
      .map((f) => ({ name: f, path: join(sessionsDir, f) }))
      .sort((a, b) => b.name.localeCompare(a.name));
    return files.length > 0 ? files[0].path : null;
  } catch {
    return null;
  }
}

/**
 * Build a map of profileDirectory → Set<url> from session files.
 */
async function buildProfileUrlMap(profileRootPath: string): Promise<Map<string, Set<string>>> {
  const profileUrlMap = new Map<string, Set<string>>();

  try {
    const entries = readdirSync(profileRootPath, { withFileTypes: true });
    const profileDirs = entries
      .filter((e) => e.isDirectory() && (e.name === "Default" || e.name.startsWith("Profile ")))
      .map((e) => e.name);

    // Extract URLs from all profile session files in parallel
    const results = await Promise.all(
      profileDirs.map(async (dirName) => {
        const sessionFile = findSessionFile(join(profileRootPath, dirName));
        if (!sessionFile) return { dirName, urls: new Set<string>() };
        const urls = await extractUrlsFromSessionFile(sessionFile);
        return { dirName, urls };
      }),
    );

    for (const { dirName, urls } of results) {
      if (urls.size > 0) {
        profileUrlMap.set(dirName, urls);
      }
    }
  } catch {
    // Can't read profile root
  }

  return profileUrlMap;
}

/**
 * Score how well a window's tab URLs match a profile's session URLs.
 * Returns the number of matching URLs.
 */
function scoreMatch(windowTabUrls: string[], profileUrls: Set<string>): number {
  let score = 0;
  for (const tabUrl of windowTabUrls) {
    if (profileUrls.has(tabUrl)) {
      score++;
    } else {
      // Try matching by removing query params/fragments for partial matches
      const baseUrl = tabUrl.split("?")[0].split("#")[0];
      for (const profileUrl of profileUrls) {
        if (profileUrl.startsWith(baseUrl)) {
          score += 0.5;
          break;
        }
      }
    }
  }
  return score;
}

/**
 * Identify which profile each window belongs to by matching tab URLs
 * against session file contents. No tabs are opened — completely non-intrusive.
 */
export async function probeWindowProfiles(
  _browserName: string,
  windows: BrowserWindow[],
  profileRootPath: string,
): Promise<BrowserWindow[]> {
  const unprobed = windows.filter((w) => w.profileDirectory === null);
  if (unprobed.length === 0) return windows;

  const profileUrlMap = await buildProfileUrlMap(profileRootPath);
  if (profileUrlMap.size === 0) return windows;

  for (const win of unprobed) {
    if (win.tabUrls.length === 0) continue;

    let bestProfile: string | null = null;
    let bestScore = 0;

    for (const [profileDir, profileUrls] of profileUrlMap) {
      const score = scoreMatch(win.tabUrls, profileUrls);
      if (score > bestScore) {
        bestScore = score;
        bestProfile = profileDir;
      }
    }

    if (bestProfile && bestScore > 0) {
      win.profileDirectory = bestProfile;
      windowProfileCache.set(win.windowId, bestProfile);
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
