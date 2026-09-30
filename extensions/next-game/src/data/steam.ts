// src/data/steam.ts
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Resolves the default Steam installation path based on the OS.
 */
export async function getDefaultSteamPath(): Promise<string | null> {
  const platform = os.platform();

  if (platform === "win32") {
    const winPaths = [
      "C:\\Program Files (x86)\\Steam",
      "C:\\Program Files\\Steam",
    ];
    for (const p of winPaths) {
      try {
        await fs.access(p);
        return p;
      } catch {
        // Continue checking next path
      }
    }
  } else if (platform === "darwin") {
    const macPath = path.join(
      os.homedir(),
      "Library/Application Support/Steam",
    );
    try {
      await fs.access(macPath);
      return macPath;
    } catch {
      // Path not found
    }
  }

  return null;
}

/**
 * Parses libraryfolders.vdf to find all Steam library paths across different drives.
 */
export async function getLibraryFolders(steamPath: string): Promise<string[]> {
  const folders: string[] = [steamPath];
  const vdfPath = path.join(steamPath, "steamapps", "libraryfolders.vdf");

  try {
    const content = await fs.readFile(vdfPath, "utf-8");
    // Regex to match "path" "D:\\SteamLibrary" or "path" "/Volumes/Games/SteamLibrary"
    const pathRegex = /"path"\s+"([^"]+)"/g;
    let match;

    while ((match = pathRegex.exec(content)) !== null) {
      // VDF escapes backslashes in Windows paths (e.g., D:\\\\SteamLibrary)
      const cleanPath = match[1].replace(/\\\\/g, "\\");
      if (cleanPath.toLowerCase() !== steamPath.toLowerCase()) {
        folders.push(cleanPath);
      }
    }
  } catch (error) {
    // If libraryfolders.vdf is missing, we just return the default steamPath
  }

  return folders;
}

/**
 * Represents basic data extracted from appmanifest files.
 */
export interface InstalledApp {
  appId: number;
  name: string;
}

/**
 * Reads all appmanifest_*.acf files in the given library folders to find installed games.
 */
export async function getInstalledApps(
  libraryFolders: string[],
): Promise<InstalledApp[]> {
  const installedApps: InstalledApp[] = [];

  for (const folder of libraryFolders) {
    const steamappsPath = path.join(folder, "steamapps");

    try {
      const files = await fs.readdir(steamappsPath);
      const manifestFiles = files.filter(
        (f) => f.startsWith("appmanifest_") && f.endsWith(".acf"),
      );

      for (const file of manifestFiles) {
        const filePath = path.join(steamappsPath, file);
        const content = await fs.readFile(filePath, "utf-8");

        const appIdMatch = content.match(/"appid"\s+"(\d+)"/i);
        const nameMatch = content.match(/"name"\s+"([^"]+)"/i);

        if (appIdMatch && nameMatch) {
          installedApps.push({
            appId: parseInt(appIdMatch[1], 10),
            name: nameMatch[1],
          });
        }
      }
    } catch {
      // Folder might not exist or lacks read permissions, skip
      continue;
    }
  }

  return installedApps;
}

export interface AppStats {
  appId: number;
  playtime: number;
  lastPlayedAt: number | null;
  launchCount: number;
}

export async function getAppStats(
  steamPath: string,
): Promise<Map<number, AppStats>> {
  const statsMap = new Map<number, AppStats>();
  const userdataDir = path.join(steamPath, "userdata");

  try {
    const accountDirs = await fs.readdir(userdataDir);
    let activeConfigPath = "";
    let latestMtime = 0;

    for (const accountId of accountDirs) {
      const configPath = path.join(
        userdataDir,
        accountId,
        "config",
        "localconfig.vdf",
      );
      try {
        const stats = await fs.stat(configPath);
        if (stats.mtimeMs > latestMtime) {
          latestMtime = stats.mtimeMs;
          activeConfigPath = configPath;
        }
      } catch {
        continue;
      }
    }

    const accountsToProcess = activeConfigPath ? [activeConfigPath] : [];

    for (const localConfigPath of accountsToProcess) {
      try {
        const content = await fs.readFile(localConfigPath, "utf-8");
        let currentAppId: number | null = null;
        const pathStack: string[] = [];
        let lastKey = "";

        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed === "{" || /^"?[^{]*"?\s*\{$/.test(trimmed)) {
            pathStack.push(lastKey.toLowerCase());
            lastKey = "";
            continue;
          }

          if (trimmed === "}") {
            pathStack.pop();
            if (pathStack.length < 2) currentAppId = null;
            continue;
          }

          const keyMatch = trimmed.match(/^"([^"]+)"/);
          if (keyMatch) {
            lastKey = keyMatch[1];
          }

          const appsIndex = pathStack.indexOf("apps");
          const isInAppsNode = appsIndex !== -1;

          if (isInAppsNode && pathStack.length === appsIndex + 1 && keyMatch) {
            const appMatch = keyMatch[1].match(/^(\d+)$/);
            if (appMatch) {
              currentAppId = parseInt(appMatch[1], 10);
              if (!statsMap.has(currentAppId)) {
                statsMap.set(currentAppId, {
                  appId: currentAppId,
                  playtime: 0,
                  lastPlayedAt: null,
                  launchCount: 0,
                });
              }
            }
          }

          if (currentAppId && pathStack.length > appsIndex) {
            const playMatch = trimmed.match(/"Playtime"\s*"(\d+)"/i);
            const lastMatch = trimmed.match(/"LastPlayed"\s*"(\d+)"/i);

            if (playMatch)
              statsMap.get(currentAppId)!.playtime = parseInt(playMatch[1], 10);
            if (lastMatch) {
              const lp = parseInt(lastMatch[1], 10) * 1000;
              statsMap.get(currentAppId)!.lastPlayedAt = lp > 0 ? lp : null;
            }
          }
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    /* ignore */
  }

  return statsMap;
}
