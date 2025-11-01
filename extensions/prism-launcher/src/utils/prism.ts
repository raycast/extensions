import * as fs from "fs-extra";
import * as path from "path";
import { ConfigIniParser } from "config-ini-parser";
import { Instance } from "../types";
import * as async from "modern-async";

export const isWindows = process.platform === "win32";

export const macOsInstancesPath = path.join(
  process.env.HOME!,
  "Library",
  "Application Support",
  "PrismLauncher",
  "instances",
);

export const windowsInstancesPath = path.join(process.env.APPDATA!, "PrismLauncher", "instances");

export const instancesPath = isWindows ? windowsInstancesPath : macOsInstancesPath;

/**
 * Get the PrismLauncher installation path dynamically
 */

export const prismLauncherAppWindows = path.join(
  process.env.LOCALAPPDATA!,
  "Programs",
  "PrismLauncher",
  "prismlauncher.exe",
);
export const prismLauncherAppMac = path.join("/Applications", "PrismLauncher.app");
export const prismLauncherWithSpaceMac = path.join("/Applications", "Prism Launcher.app");

async function getPrismLauncherPath(): Promise<string | null> {
  if (isWindows && (await fs.pathExists(prismLauncherAppWindows))) {
    return prismLauncherAppWindows;
  }

  if (await fs.pathExists(prismLauncherAppMac)) {
    return prismLauncherAppMac;
  }

  if (await fs.pathExists(prismLauncherWithSpaceMac)) {
    return prismLauncherWithSpaceMac;
  }

  return null;
}

/**
 * Check if PrismLauncher is installed
 */
export async function isPrismLauncherInstalled(): Promise<boolean> {
  const prismLauncherPath = await getPrismLauncherPath();
  return prismLauncherPath !== null && (await fs.pathExists(instancesPath));
}

/**
 * Load favorite instance IDs from localStorage
 */
export async function loadFavoriteInstanceIds(localStorage: {
  getItem: (key: string) => Promise<string | undefined>;
}): Promise<string[]> {
  const storedFavorites = await localStorage.getItem("favoriteInstanceIds");
  return storedFavorites ? JSON.parse(storedFavorites) : [];
}

/**
 * Save favorite instance IDs to localStorage
 */
export async function saveFavoriteInstanceIds(
  localStorage: { setItem: (key: string, value: string) => Promise<void> },
  favoriteIds: string[],
): Promise<void> {
  await localStorage.setItem("favoriteInstanceIds", JSON.stringify(favoriteIds));
}

/**
 * Load all PrismLauncher instances
 */
export async function loadInstances(favoriteIds: string[]): Promise<Instance[]> {
  // Get all folders in instances folder
  const instanceFolders = await async.asyncFilter(await fs.readdir(instancesPath), async (instanceId: string) => {
    const stats = await fs.stat(path.join(instancesPath, instanceId));
    return stats.isDirectory() && !["_LAUNCHER_TEMP", "_MMC_TEMP", ".LAUNCHER_TEMP", ".tmp"].includes(instanceId);
  });

  // Get all instances and their details
  const instancesList = await async.asyncMap(instanceFolders, async (instanceId: string) => {
    const parser = new ConfigIniParser();
    const instanceFolder = path.join(instancesPath, instanceId);
    const instanceCfgStr = (await fs.readFile(path.join(instanceFolder, "instance.cfg"))).toString("utf-8");
    const instanceCfg = parser.parse(instanceCfgStr);

    const paths = await async.asyncMap(["minecraft", ".minecraft"], async (subfolder: string) =>
      path.join(instanceFolder, subfolder, "icon.png"),
    );
    const iconPath = await async.asyncFind(paths, async (p: string) => await fs.pathExists(p));

    return {
      name: instanceCfg.get("General", "name", instanceId),
      id: instanceId,
      icon: iconPath,
      favorite: favoriteIds.includes(instanceId),
    };
  });

  // Sort instances with favorites at the top, then alphabetically
  return sortInstances(instancesList);
}

/**
 * Sort instances with favorites at the top, then alphabetically
 */
export function sortInstances(instancesList: Instance[]): Instance[] {
  return instancesList.sort((a, b) => {
    // If one is favorite and the other is not, favorite comes first
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    // Otherwise sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get the minecraft folder path for an instance
 */
export async function getMinecraftFolderPath(instanceId: string): Promise<string | null> {
  const minecraftPath = path.join(instancesPath, instanceId, "minecraft");
  if (await fs.pathExists(minecraftPath)) {
    return minecraftPath;
  }

  const dotMinecraftPath = path.join(instancesPath, instanceId, ".minecraft");
  if (await fs.pathExists(dotMinecraftPath)) {
    return dotMinecraftPath;
  }

  return null;
}
