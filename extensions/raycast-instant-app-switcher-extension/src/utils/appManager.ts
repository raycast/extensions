import { exec } from "child_process";
import { promisify } from "util";
import { readdir, stat } from "fs/promises";
import path from "path";
import { showToast, Toast, closeMainWindow, Image } from "@raycast/api";
import { App, CACHE_DURATION } from "../types";

const execAsync = promisify(exec);

// Cache for installed applications
let installedAppsCache: App[] | null = null;
let cacheTimestamp: number = 0;

/**
 * Get all currently running applications using lsappinfo
 */
export async function getRunningApps(): Promise<App[]> {
  try {
    // Ultra-fast lsappinfo visibleProcessList - 5ms execution time
    const { stdout } = await execAsync(`lsappinfo visibleProcessList`);
    const apps: App[] = [];

    if (stdout.trim()) {
      // Parse: ASN:0x0-0x123-"AppName": ASN:0x0-0x456-"AppName2":
      const matches = stdout.match(/ASN:[^-]+-[^-]+-"([^"]+)"/g);
      if (matches) {
        for (const match of matches) {
          const appNameMatch = match.match(/"([^"]+)"/);
          if (appNameMatch) {
            const appName = appNameMatch[1].replace(/_/g, " "); // Replace underscores with spaces
            apps.push({
              name: appName,
              windowTitle: "",
              isRunning: true,
            });
          }
        }
      }
    }

    return apps;
  } catch (error) {
    console.error("Error getting running apps:", error);
    return [];
  }
}

/**
 * Get all installed applications from common directories with caching
 */
export async function getInstalledApps(): Promise<App[]> {
  // Check cache first
  const now = Date.now();
  if (installedAppsCache && now - cacheTimestamp < CACHE_DURATION) {
    return installedAppsCache;
  }

  // Set 50ms timeout
  const timeoutPromise = new Promise<App[]>((_, reject) => {
    setTimeout(() => reject(new Error("load installed apps timeout")), 50);
  });

  const scanPromise = async (): Promise<App[]> => {
    const appPaths = [
      "/Applications",
      "/Applications/Utilities",
      "/System/Applications",
      "/System/Applications/Utilities",
      "/System/Library/CoreServices/Applications",
      path.join(process.env.HOME || "", "Applications"),
    ];

    const installedApps: App[] = [];
    const seenApps = new Set<string>();

    for (const appPath of appPaths) {
      try {
        const entries = await readdir(appPath);
        for (const entry of entries) {
          if (entry.endsWith(".app")) {
            const appName = entry.replace(".app", "");
            const fullPath = path.join(appPath, entry);

            // Avoid duplicates
            if (!seenApps.has(appName)) {
              seenApps.add(appName);

              try {
                const stats = await stat(fullPath);
                if (stats.isDirectory()) {
                  installedApps.push({
                    name: appName,
                    windowTitle: "",
                    isRunning: false,
                    bundlePath: fullPath,
                  });
                }
              } catch {
                // Skip apps we can't access
                continue;
              }
            }
          }
        }
      } catch {
        // Skip directories we can't access
        continue;
      }
    }

    return installedApps;
  };

  try {
    const installedApps = await Promise.race([scanPromise(), timeoutPromise]);

    // Update cache
    installedAppsCache = installedApps;
    cacheTimestamp = now;

    return installedApps;
  } catch {
    // On timeout or error, return cached apps or empty array
    return installedAppsCache || [];
  }
}

/**
 * Build a complete mapping of display names to bundle names from lsappinfo list
 */
export async function buildAppNameMapping(): Promise<Map<string, string>> {
  try {
    const { stdout } = await execAsync(`lsappinfo list`);
    const mapping = new Map<string, string>();

    // Find the app block that matches our display name
    const appBlocks = stdout.split(/\n\s*\d+\)\s+"/).slice(1);

    for (const block of appBlocks) {
      const appNameMatch = block.match(/^([^"]+)"/);
      const bundlePathMatch = block.match(/bundle path="([^"]+)"/);

      if (appNameMatch && bundlePathMatch) {
        const displayName = appNameMatch[1].replace(/_/g, " ");
        const bundlePath = bundlePathMatch[1];
        // Extract app name from bundle path: "/Applications/Visual Studio Code.app" -> "Visual Studio Code"
        const match = bundlePath.match(/\/([^/]+)\.app$/);
        if (match) {
          mapping.set(displayName, match[1]);
        }
      }
    }

    return mapping;
  } catch (error) {
    console.error("Error building app name mapping:", error);
    return new Map();
  }
}

/**
 * Resolve app display name to bundle name (used for switching)
 */
async function resolveAppName(displayName: string): Promise<string> {
  try {
    // Lazily call lsappinfo list to resolve the proper app name
    const { stdout } = await execAsync(`lsappinfo list`);

    // Find the app block that matches our display name
    const appBlocks = stdout.split(/\n\s*\d+\)\s+"/).slice(1);

    for (const block of appBlocks) {
      const appNameMatch = block.match(/^([^"]+)"/);
      const bundlePathMatch = block.match(/bundle path="([^"]+)"/);

      if (appNameMatch && bundlePathMatch) {
        const blockDisplayName = appNameMatch[1].replace(/_/g, " ");

        if (blockDisplayName === displayName) {
          const bundlePath = bundlePathMatch[1];
          // Extract app name from bundle path: "/Applications/Visual Studio Code.app" -> "Visual Studio Code"
          const match = bundlePath.match(/\/([^/]+)\.app$/);
          return match ? match[1] : displayName;
        }
      }
    }

    // Fallback to display name if not found
    return displayName;
  } catch (error) {
    console.error("Error resolving app name:", error);
    return displayName;
  }
}

/**
 * Get app icon for display
 */
export function getAppIcon(app: App): Image.ImageLike {
  // Use actual app icon if we have a bundle path
  if (app.bundlePath) {
    return { fileIcon: app.bundlePath };
  }

  // Fallback: try to construct path from app name
  const defaultPaths = [
    `/Applications/${app.name}.app`,
    `/System/Applications/${app.name}.app`,
    `/System/Applications/Utilities/${app.name}.app`,
  ];

  // Return first path as fileIcon - Raycast will handle if it doesn't exist
  return { fileIcon: defaultPaths[0] };
}

/**
 * Switch to or launch an application
 */
export async function switchToApp(app: App): Promise<void> {
  try {
    if (app.isRunning) {
      // For running apps, resolve the proper app name
      const appName = await resolveAppName(app.name);
      await execAsync(`open -a "${appName.replace(/"/g, '\\"')}"`);
    } else {
      // For non-running apps, use the bundle path or app name
      const targetPath = app.bundlePath || app.name;
      await execAsync(`open -a "${targetPath.replace(/"/g, '\\"')}"`);
    }
    await closeMainWindow();
  } catch (error) {
    console.error("Error switching to app:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to switch app",
      message: `Could not switch to ${app.name}`,
    });
  }
}

/**
 * Get all apps (running + installed) with proper merging and sorting
 */
export async function getAllApps(recentApps: string[] = []): Promise<App[]> {
  const [runningApps, installedApps, appNameMapping] = await Promise.all([
    getRunningApps(),
    getInstalledApps(),
    buildAppNameMapping(), // Single call to build complete mapping
  ]);

  // Create enhanced matching for running apps
  const runningAppMap = new Map<string, App>();
  const runningAppAliases = new Map<string, string>(); // Maps display name to bundle name

  // Build running apps map using the pre-built mapping (no repeated shell calls!)
  for (const runningApp of runningApps) {
    runningAppMap.set(runningApp.name, runningApp);

    // Use the pre-built mapping to resolve bundle names
    const bundleName = appNameMapping.get(runningApp.name);
    if (bundleName && bundleName !== runningApp.name) {
      runningAppAliases.set(runningApp.name, bundleName);
    }
  }

  // Start with all installed apps and mark running ones
  const allApps: App[] = [];
  const processedApps = new Set<string>();

  // Process installed apps and check if they're running
  for (const installedApp of installedApps) {
    if (processedApps.has(installedApp.name)) continue;

    // Check if this installed app is currently running
    let matchingRunningApp: App | null = null;

    // Direct name match
    if (runningAppMap.has(installedApp.name)) {
      matchingRunningApp = runningAppMap.get(installedApp.name)!;
    } else {
      // Check if any running app resolves to this bundle name
      for (const [displayName, bundleName] of runningAppAliases.entries()) {
        if (bundleName === installedApp.name) {
          matchingRunningApp = runningAppMap.get(displayName)!;
          break;
        }
      }
    }

    if (matchingRunningApp) {
      // This installed app is running - use the running app's info but keep bundle path
      allApps.push({
        name: installedApp.name, // Use the proper bundle name
        windowTitle: matchingRunningApp.windowTitle,
        isRunning: true,
        bundlePath: installedApp.bundlePath,
      });
    } else {
      // This installed app is not running
      allApps.push(installedApp);
    }

    processedApps.add(installedApp.name);
  }

  // Add any running apps that weren't found in installed apps (edge case)
  for (const runningApp of runningApps) {
    const bundleName = runningAppAliases.get(runningApp.name) || runningApp.name;
    if (!processedApps.has(bundleName) && !processedApps.has(runningApp.name)) {
      allApps.push({
        ...runningApp,
        name: bundleName, // Use resolved name if available
      });
      processedApps.add(bundleName);
    }
  }

  // Sort: recent apps first, then running apps, then alphabetically
  allApps.sort((a, b) => {
    const aRecentIndex = recentApps.indexOf(a.name);
    const bRecentIndex = recentApps.indexOf(b.name);

    // Both in recent list - sort by recency
    if (aRecentIndex !== -1 && bRecentIndex !== -1) {
      return aRecentIndex - bRecentIndex;
    }

    // One in recent list - recent comes first
    if (aRecentIndex !== -1) return -1;
    if (bRecentIndex !== -1) return 1;

    // Neither in recent list - running apps first, then alphabetically
    if (a.isRunning && !b.isRunning) return -1;
    if (!a.isRunning && b.isRunning) return 1;
    return a.name.localeCompare(b.name);
  });

  return allApps;
}

/**
 * Search and filter apps based on search term with intelligent scoring
 */
export function searchApps(apps: App[], searchTerm: string, recentApps: string[]): App[] {
  if (!searchTerm || searchTerm === " ") {
    return apps;
  }

  // Remove leading space if present
  const cleanedTerm = searchTerm.startsWith(" ") ? searchTerm.slice(1) : searchTerm;
  if (!cleanedTerm) {
    return apps;
  }

  const searchLower = cleanedTerm.toLowerCase();

  // Score apps based on search criteria
  const scoredApps = apps.map((app) => {
    const appNameLower = app.name.toLowerCase();
    let score = 0;

    // 1. Recent app bonus (higher priority than running)
    const recentIndex = recentApps.indexOf(app.name);
    if (recentIndex !== -1) {
      // More recent = higher score (max 200 points)
      score += 100 - recentIndex * 5;
    }

    // 2. Running app bonus
    if (app.isRunning) {
      score += 200;
    }

    // 3. Partial match anywhere in name
    if (appNameLower.includes(searchLower)) {
      score += 400;
      // Boost if match is closer to beginning
      const index = appNameLower.indexOf(searchLower);
      score += Math.max(0, 50 - index);
    }

    // 4. Abbreviation match (e.g., 'vsc' for 'Visual Studio Code')
    const words = appNameLower.split(/[\s\-_]+/);
    const abbreviation = words.map((word) => word.charAt(0).toLowerCase()).join("");
    if (abbreviation.includes(searchLower)) {
      score += 800;
    }

    // 5. Full match from beginning (highest priority)
    if (appNameLower.startsWith(searchLower)) {
      score += 1000;
    }

    return { app, score };
  });

  // Filter out apps with no score and sort by score
  return scoredApps
    .filter((item) => item.score >= 400)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.app);
}
