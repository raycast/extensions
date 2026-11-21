import { ConfigIniParser } from "config-ini-parser";
import * as fs from "fs-extra";
import * as async from "modern-async";
import * as os from "os";
import * as path from "path";
import nbt from "prismarine-nbt";
import { pathToFileURL } from "url";
import type { Instance, Screenshot, Server } from "../types";
import { getPreferences } from "./preferences";
import { getDownloadsFolderPath, getShortcutTargetPath } from "./powershell";

/**
 * Convert a local filesystem path to a `file://` URL that Raycast's `Image.source`
 */
export function toFileUrl(p: string | undefined): string | undefined {
  return p ? pathToFileURL(p).href : undefined;
}

export const isWin = process.platform === "win32";
export const isMac = process.platform === "darwin";

export async function getPrismLauncherPath(): Promise<string | null> {
  const { path: installPath, bundleId, name } = getPreferences("installPath");

  if (!(await fs.pathExists(installPath))) return null;

  if (isMac && bundleId !== "org.prismlauncher.PrismLauncher") return null;
  const shortcutTargetPath = (await getShortcutTargetPath(installPath)) || "";
  if (isWin && path.basename(shortcutTargetPath) !== "prismlauncher.exe" && name === "Prism Launcher") return null;

  return shortcutTargetPath;
}

/**
 * Get the instances path based on OS
 */
export async function getInstancesPath(): Promise<string | null> {
  const customInstancesPath = getPreferences("instancesPath");
  if (!(await fs.pathExists(customInstancesPath))) return null;

  return customInstancesPath;
}

/**
 * Check if PrismLauncher is installed
 */
export async function isPrismLauncherInstalled(): Promise<boolean> {
  const [prismLauncherPath, instancesPath] = await Promise.all([getPrismLauncherPath(), getInstancesPath()]);

  return prismLauncherPath !== null && instancesPath !== null;
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
 * Prism component UIDs that identify a mod loader, mapped to their display name
 */
const LOADER_UIDS: Record<string, string> = {
  "net.minecraftforge": "Forge",
  "net.neoforged": "NeoForge",
  "net.fabricmc.fabric-loader": "Fabric",
  "net.legacyfabric.fabric-loader": "Legacy Fabric",
  "org.quiltmc.quilt-loader": "Quilt",
  "com.mumfrey.liteloader": "LiteLoader",
};

type PackComponent = {
  uid?: string;
  version?: string;
  cachedVersion?: string;
};

/**
 * Read the Minecraft version and mod loader of an instance from its mmc-pack.json,
 * falling back to the legacy `IntendedVersion` key in instance.cfg
 */
async function readInstanceVersion(
  instanceFolder: string,
  instanceCfg: ConfigIniParser,
): Promise<Pick<Instance, "minecraftVersion" | "loader" | "loaderVersion">> {
  let intendedVersion: string | undefined;
  try {
    intendedVersion = instanceCfg.get("General", "IntendedVersion", "") || undefined;
  } catch {
    // Section missing on some legacy configs
  }

  try {
    const pack = await fs.readJson(path.join(instanceFolder, "mmc-pack.json"));
    const components: PackComponent[] = Array.isArray(pack?.components) ? pack.components : [];

    const minecraft = components.find((component) => component.uid === "net.minecraft");
    const loader = components.find((component) => component.uid && LOADER_UIDS[component.uid]);

    return {
      minecraftVersion: minecraft?.version ?? minecraft?.cachedVersion ?? intendedVersion,
      loader: loader?.uid ? LOADER_UIDS[loader.uid] : "Vanilla",
      loaderVersion: loader?.version ?? loader?.cachedVersion,
    };
  } catch {
    // No (or unreadable) mmc-pack.json - legacy instance or partial download
    return { minecraftVersion: intendedVersion };
  }
}

/**
 * Load all PrismLauncher instances
 */
export async function loadInstances(
  favoriteIds: string[],
  onlyWithServers: boolean = false,
  onlyWithScreenshots: boolean = false,
): Promise<Instance[]> {
  const instancesPath = await getInstancesPath();
  if (!instancesPath) return [];

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

    const version = await readInstanceVersion(instanceFolder, instanceCfg);

    // Check if instance has servers.dat
    let hasServers = false;
    if (onlyWithServers) {
      const serversPath = path.join(instanceFolder, "minecraft", "servers.dat");
      const legacyServersPath = path.join(instanceFolder, ".minecraft", "servers.dat");
      hasServers = (await fs.pathExists(serversPath)) || (await fs.pathExists(legacyServersPath));
    }

    // Check if instance has any screenshots
    let hasScreenshots = false;
    if (onlyWithScreenshots) {
      hasScreenshots = await instanceHasScreenshots(instanceId);
    }

    return {
      name: instanceCfg.get("General", "name", instanceId),
      id: instanceId,
      icon: toFileUrl(iconPath),
      favorite: favoriteIds.includes(instanceId),
      ...version,
      ...(onlyWithServers ? { hasServers } : {}),
      ...(onlyWithScreenshots ? { hasScreenshots } : {}),
    };
  });

  // Filter instances with servers/screenshots if requested
  let filteredInstances = instancesList;
  if (onlyWithServers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredInstances = filteredInstances.filter((instance: any) => instance.hasServers);
  }
  if (onlyWithScreenshots) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredInstances = filteredInstances.filter((instance: any) => instance.hasScreenshots);
  }

  // Sort instances with favorites at the top, then alphabetically
  return sortInstances(filteredInstances);
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
  const instancesPath = await getInstancesPath();
  if (!instancesPath) return null;

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

const SCREENSHOT_EXTENSIONS = [".png", ".jpg", ".jpeg"];

/**
 * Get the screenshots folder path for an instance, if it exists
 */
export async function getScreenshotsFolderPath(instanceId: string): Promise<string | null> {
  const minecraftPath = await getMinecraftFolderPath(instanceId);
  if (!minecraftPath) return null;

  const screenshotsPath = path.join(minecraftPath, "screenshots");
  return (await fs.pathExists(screenshotsPath)) ? screenshotsPath : null;
}

/**
 * Check whether an instance has at least one screenshot
 */
async function instanceHasScreenshots(instanceId: string): Promise<boolean> {
  const screenshotsPath = await getScreenshotsFolderPath(instanceId);
  if (!screenshotsPath) return false;

  const files = await fs.readdir(screenshotsPath);
  return files.some((file) => SCREENSHOT_EXTENSIONS.includes(path.extname(file).toLowerCase()));
}

/**
 * Load screenshots from a single instance, newest first
 */
export async function loadScreenshotsFromInstance(instance: Instance): Promise<Screenshot[]> {
  const screenshotsPath = await getScreenshotsFolderPath(instance.id);
  if (!screenshotsPath) return [];

  const files = await fs.readdir(screenshotsPath);
  const imageFiles = files.filter((file) => SCREENSHOT_EXTENSIONS.includes(path.extname(file).toLowerCase()));

  const screenshots = await async.asyncMap(imageFiles, async (file: string): Promise<Screenshot> => {
    const filePath = path.join(screenshotsPath, file);
    const stats = await fs.stat(filePath);

    return {
      path: filePath,
      name: path.basename(file, path.extname(file)),
      instanceId: instance.id,
      instanceName: instance.name,
      modifiedAt: stats.mtimeMs,
    };
  });

  return screenshots.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

/**
 * Copy a screenshot into the user's Downloads folder, avoiding overwrites
 */
export async function saveScreenshotToDownloads(screenshot: Screenshot): Promise<string> {
  const downloadsPath = (isWin && (await getDownloadsFolderPath())) || path.join(os.homedir(), "Downloads");
  await fs.ensureDir(downloadsPath);

  const extension = path.extname(screenshot.path);
  let destination = path.join(downloadsPath, `${screenshot.name}${extension}`);
  for (let suffix = 1; ; suffix++) {
    try {
      await fs.copy(screenshot.path, destination, { overwrite: false, errorOnExist: true });
      return destination;
    } catch (error) {
      if (!(await fs.pathExists(destination))) throw error;
      destination = path.join(downloadsPath, `${screenshot.name} (${suffix})${extension}`);
    }
  }
}

/**
 * Parse servers.dat NBT file and extract server list
 */
async function parseServersDat(filePath: string): Promise<Server[]> {
  try {
    const buffer = await fs.readFile(filePath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { parsed } = await (nbt as any).parse(buffer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const simplified = (nbt as any).simplify(parsed);

    const serversList = simplified.servers || [];

    const servers: Server[] = [];

    for (let index = 0; index < serversList.length; index++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const server: any = serversList[index];

      servers.push({
        name: server.name || `Server ${index + 1}`,
        address: server.ip || "Unknown",
        icon: server.icon ? `data:image/png;base64,${server.icon}` : undefined,
        instanceId: "",
        instanceName: "",
        favicon: server.icon ? `data:image/png;base64,${server.icon}` : undefined,
      });
    }

    return servers;
  } catch (error) {
    // If servers.dat doesn't exist or is invalid, return empty array
    console.error("Error parsing servers.dat:", error);
    return [];
  }
}

/**
 * Load servers from a single instance
 */
export async function parseServersFromInstance(instance: Instance): Promise<Server[]> {
  const minecraftPath = await getMinecraftFolderPath(instance.id);
  if (!minecraftPath) return [];

  const serversDatPath = path.join(minecraftPath, "servers.dat");
  if (!(await fs.pathExists(serversDatPath))) return [];

  const servers = await parseServersDat(serversDatPath);

  // Add instance information to each server (but keep the server's own icon/favicon)
  return servers.map((server) => ({
    ...server,
    instanceId: instance.id,
    instanceName: instance.name,
    // Don't overwrite server.icon - it's the favicon from the NBT file
    // Only add instance.icon if the server doesn't have its own icon
    icon: server.icon || instance.icon,
  }));
}

/**
 * Load all servers from all instances
 */
export async function loadServersFromInstances(instances: Instance[]): Promise<Server[]> {
  const allServers: Server[] = [];

  for (const instance of instances) {
    const servers = await parseServersFromInstance(instance);
    allServers.push(...servers);
  }

  return allServers;
}

/**
 * Load favorite server addresses from localStorage
 */
export async function loadFavoriteServers(localStorage: {
  getItem: (key: string) => Promise<string | undefined>;
}): Promise<string[]> {
  const storedFavorites = await localStorage.getItem("favoriteServerAddresses");
  return storedFavorites ? JSON.parse(storedFavorites) : [];
}

/**
 * Save favorite server addresses to localStorage
 */
export async function saveFavoriteServers(
  localStorage: { setItem: (key: string, value: string) => Promise<void> },
  favoriteServers: string[],
): Promise<void> {
  await localStorage.setItem("favoriteServerAddresses", JSON.stringify(favoriteServers));
}

/**
 * Sort servers with favorites at the top
 */
export function sortServers(serversList: Server[], favoriteAddresses: string[]): Server[] {
  return serversList.sort((a, b) => {
    const aIsFavorite = favoriteAddresses.includes(a.address);
    const bIsFavorite = favoriteAddresses.includes(b.address);

    // If one is favorite and the other is not, favorite comes first
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;

    // Otherwise sort alphabetically
    return a.name.localeCompare(b.name);
  });
}
