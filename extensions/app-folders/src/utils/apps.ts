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

  async function collectDirApps(
    dir: string,
    depth: number,
  ): Promise<AppItem[]> {
    const items: AppItem[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const nestedPromises: Promise<AppItem[]>[] = [];

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.name.endsWith(".app")) {
          const appName = entry.name.replace(/\.app$/i, "");
          // Prevent showing internal CoreServices helper apps (Finder allowed)
          if (dir.includes("CoreServices") && appName !== "Finder") {
            continue;
          }
          items.push({
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
          nestedPromises.push(collectDirApps(fullPath, depth + 1));
        }
      }

      if (nestedPromises.length > 0) {
        const nestedResults = await Promise.all(nestedPromises);
        for (const nested of nestedResults) {
          items.push(...nested);
        }
      }
    } catch {
      // Safely ignore permission errors or non-existent directories
    }
    return items;
  }

  // Scan all application directories concurrently for faster discovery
  const dirResults = await Promise.all(
    SCAN_DIRECTORIES.map((dir) => collectDirApps(dir, 0)),
  );

  for (const dirApps of dirResults) {
    for (const app of dirApps) {
      if (visitedPaths.has(app.path)) continue;
      visitedPaths.add(app.path);
      if (visitedNames.has(app.name.toLowerCase())) continue;
      visitedNames.add(app.name.toLowerCase());
      discoveredApps.push(app);
    }
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

  // Launch all apps concurrently so multi-app folders open immediately
  const results = await Promise.all(
    apps.map(async (app) => {
      try {
        await openSingleAppPath(app.path);
        return { ok: true as const, name: app.name };
      } catch {
        return { ok: false as const, name: app.name };
      }
    }),
  );

  const openedCount = results.filter((r) => r.ok).length;
  const failedApps = results.filter((r) => !r.ok).map((r) => r.name);

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
