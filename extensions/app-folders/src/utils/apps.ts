import {
  closeMainWindow,
  open as raycastOpen,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { AppItem } from "../types";
import { t } from "./i18n";

const execFileAsync = promisify(execFile);

// Standard directories where applications are installed on macOS
const SCAN_DIRECTORIES = [
  "/Applications",
  "/System/Applications",
  "/System/Applications/Utilities",
  "/System/Library/CoreServices",
  path.join(os.homedir(), "Applications"),
];

/**
 * Builds search keyword variants from an app name.
 * e.g. "Microsoft PowerPoint" -> ["Microsoft", "PowerPoint", "MicrosoftPowerPoint"]
 */
function buildSearchKeywords(appName: string): string[] {
  const words = appName
    .split(/[\s\-_]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  const compact = appName.replace(/\s+/g, "");
  return Array.from(new Set([...words, compact]));
}

/**
 * Scans all installed .app applications on the macOS system.
 * Traverses 1 level of subdirectories (e.g. /Applications/Setapp) to avoid missing nested apps.
 */
export async function scanInstalledApps(): Promise<AppItem[]> {
  const discoveredApps: AppItem[] = [];
  const visitedPaths = new Set<string>();
  const visitedNames = new Set<string>();

  async function scanDir(dir: string, depth: number) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.name.endsWith(".app")) {
          if (visitedPaths.has(fullPath)) continue;
          visitedPaths.add(fullPath);

          const appName = entry.name.replace(/\.app$/i, "");
          // Prevent showing internal CoreServices helper apps (Finder allowed)
          if (dir.includes("CoreServices") && appName !== "Finder") {
            continue;
          }
          if (visitedNames.has(appName.toLowerCase())) continue;
          visitedNames.add(appName.toLowerCase());

          discoveredApps.push({
            id: fullPath,
            name: appName,
            path: fullPath,
            keywords: buildSearchKeywords(appName),
          });
        } else if (
          entry.isDirectory() &&
          depth < 1 &&
          !dir.includes("CoreServices")
        ) {
          // Scan 1 level deeper inside /Applications (e.g. Setapp, Adobe folders)
          await scanDir(fullPath, depth + 1);
        }
      }
    } catch {
      // Safely ignore permission errors or non-existent directories
    }
  }

  for (const dir of SCAN_DIRECTORIES) {
    await scanDir(dir, 0);
  }

  return discoveredApps.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Opens a single app path via Raycast API or macOS `open` command without shell interpolation.
 */
async function openSingleAppPath(appPath: string): Promise<void> {
  await fs.access(appPath);
  try {
    await raycastOpen(appPath);
  } catch {
    await execFileAsync("open", [appPath]);
  }
}

/**
 * Launches the selected app and closes the Raycast window.
 */
export async function launchApp(app: AppItem): Promise<boolean> {
  try {
    await openSingleAppPath(app.path);
    await closeMainWindow();
    return true;
  } catch (error) {
    await showFailureToast(error, {
      title: t.launchFailedTitle,
    });
    return false;
  }
}

/**
 * Launches all apps in a folder at once and reports accurate launch results.
 */
export async function launchAllApps(
  apps: AppItem[],
  folderName: string,
): Promise<boolean> {
  if (!apps || apps.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: t.noAppsToLaunch,
    });
    return false;
  }

  let openedCount = 0;
  const failedApps: string[] = [];

  for (const app of apps) {
    try {
      await openSingleAppPath(app.path);
      openedCount += 1;
    } catch {
      failedApps.push(app.name);
    }
  }

  if (openedCount > 0) {
    await closeMainWindow();
  }

  if (openedCount === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: t.launchAllFailedTitle,
      message: t.launchAllFailedMessage(failedApps),
    });
    return false;
  }

  if (failedApps.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: t.launchAllPartialTitle,
      message: t.launchAllPartialMessage(openedCount, failedApps),
    });
    return false;
  }

  await showToast({
    style: Toast.Style.Success,
    title: t.launchAllSuccessTitle,
    message: t.launchAllSuccessMessage(openedCount, folderName),
  });
  return true;
}
