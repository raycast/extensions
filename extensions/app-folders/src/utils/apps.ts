import {
  closeMainWindow,
  open as raycastOpen,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { AppItem } from "../types";
import { t } from "./i18n";

const execAsync = promisify(exec);

// Standard directories where applications are installed on macOS
const SCAN_DIRECTORIES = [
  "/Applications",
  "/System/Applications",
  "/System/Applications/Utilities",
  "/System/Applications/CoreServices",
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
 * Launches the selected app and closes the Raycast window.
 * 1. Raycast native open API
 * 2. Fallback to macOS `open` shell command
 */
export async function launchApp(app: AppItem): Promise<boolean> {
  try {
    await closeMainWindow();
    await raycastOpen(app.path);
    return true;
  } catch {
    try {
      await execAsync(`open "${app.path}"`);
      await closeMainWindow();
      return true;
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: t.launchFailedTitle,
        message: t.launchFailedMessage(app.name),
      });
      return false;
    }
  }
}

/**
 * Launches all apps in a folder at once and closes Raycast.
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

  await closeMainWindow();
  for (const app of apps) {
    try {
      await raycastOpen(app.path);
    } catch {
      await execAsync(`open "${app.path}"`).catch(() => {});
    }
  }

  await showToast({
    style: Toast.Style.Success,
    title: t.launchAllSuccessTitle,
    message: t.launchAllSuccessMessage(apps.length, folderName),
  });
  return true;
}
