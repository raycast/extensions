import * as fs from "fs-extra";
import * as path from "path";
import { ConfigIniParser } from "config-ini-parser";
import { Instance, Server } from "../types";
import * as async from "modern-async";
import nbt from "prismarine-nbt";

export const isWin = process.platform === "win32";

const macInstancesPath = path.join(process.env.HOME!, "Library", "Application Support", "PrismLauncher", "instances");
const winInstancesPath = path.join(process.env.HOME!, "AppData", "Roaming", "PrismLauncher", "instances");

export const instancesPath = isWin ? winInstancesPath : macInstancesPath;

export const winPrismLauncherPath = path.join(
  process.env.HOME!,
  "AppData",
  "Local",
  "Programs",
  "PrismLauncher",
  "prismlauncher.exe",
);
const macPrismLauncherApp = path.join("/Applications", "PrismLauncher.app");
const macPrismLauncherWithSpace = path.join("/Applications", "Prism Launcher.app");

/**
 * Get the PrismLauncher installation path dynamically
 */
async function getPrismLauncherPath(): Promise<string | null> {
  if (isWin) {
    if (await fs.pathExists(winPrismLauncherPath)) {
      return winPrismLauncherPath;
    }
  }

  if (await fs.pathExists(macPrismLauncherApp)) {
    return macPrismLauncherApp;
  }

  if (await fs.pathExists(macPrismLauncherWithSpace)) {
    return macPrismLauncherWithSpace;
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
export async function loadInstances(favoriteIds: string[], onlyWithServers: boolean = false): Promise<Instance[]> {
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

    // Check if instance has servers.dat
    let hasServers = false;
    if (onlyWithServers) {
      const serversPath = path.join(instanceFolder, "minecraft", "servers.dat");
      const legacyServersPath = path.join(instanceFolder, ".minecraft", "servers.dat");
      hasServers = (await fs.pathExists(serversPath)) || (await fs.pathExists(legacyServersPath));
    }

    return {
      name: instanceCfg.get("General", "name", instanceId),
      id: instanceId,
      icon: iconPath,
      favorite: favoriteIds.includes(instanceId),

      ...(onlyWithServers ? { hasServers } : {}),
    };
  });

  // Filter instances with servers if requested
  let filteredInstances = instancesList;
  if (onlyWithServers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredInstances = instancesList.filter((instance: any) => instance.hasServers);
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
