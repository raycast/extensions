import { exec } from "child_process";
import { promisify } from "util";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

export interface SteamGame {
  appid: number;
  name: string;
  installDir: string;
  sizeOnDisk: number;
  lastUpdated?: number;
  state?: number;
}

export interface SteamLibraryInfo {
  games: SteamGame[];
  totalSize: number;
  gameCount: number;
}

/**
 * Get Steam installation path from Windows Registry
 */
async function getSteamPath(): Promise<string | null> {
  try {
    // Try both registry paths for Steam installation
    const registryPaths = ["HKLM:\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "HKLM:\\SOFTWARE\\Valve\\Steam"];

    for (const path of registryPaths) {
      try {
        const { stdout } = await execAsync(
          `powershell -Command "Get-ItemProperty -Path '${path}' -Name 'InstallPath' | Select-Object -ExpandProperty InstallPath"`,
        );
        const steamPath = stdout.trim();
        if (steamPath && existsSync(steamPath)) {
          return steamPath;
        }
      } catch {
        // Continue to next registry path
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting Steam path:", error);
    return null;
  }
}

/**
 * Parse libraryfolders.vdf to get all Steam library paths
 */
async function getSteamLibraryPaths(steamPath: string): Promise<string[]> {
  try {
    const libraryFoldersPath = join(steamPath, "steamapps", "libraryfolders.vdf");

    if (!existsSync(libraryFoldersPath)) {
      return [steamPath]; // Fallback to main Steam directory
    }

    const content = await readFile(libraryFoldersPath, "utf-8");
    const libraryPaths: string[] = [steamPath]; // Always include main Steam directory

    // Parse VDF format to extract library paths
    const pathMatches = content.match(/"path"\s+"([^"]+)"/g);
    if (pathMatches) {
      for (const match of pathMatches) {
        const path = match.match(/"path"\s+"([^"]+)"/)?.[1];
        if (path && existsSync(path)) {
          libraryPaths.push(path);
        }
      }
    }

    return libraryPaths;
  } catch (error) {
    console.error("Error reading library folders:", error);
    return [steamPath];
  }
}

/**
 * Parse appmanifest_*.acf files to get installed games
 */
async function parseAppManifests(libraryPath: string): Promise<SteamGame[]> {
  try {
    const steamappsPath = join(libraryPath, "steamapps");
    if (!existsSync(steamappsPath)) {
      return [];
    }

    // Use Node.js readdir instead of PowerShell to avoid carriage return issues
    const files = await readdir(steamappsPath);
    const manifestFiles = files.filter((file) => file.startsWith("appmanifest_") && file.endsWith(".acf"));

    const games: SteamGame[] = [];

    for (const manifestFile of manifestFiles) {
      try {
        const manifestPath = join(steamappsPath, manifestFile);

        // Check if file exists before trying to read it
        if (!existsSync(manifestPath)) {
          console.warn(`Manifest file not found: ${manifestPath}`);
          continue;
        }

        const content = await readFile(manifestPath, "utf-8");

        // Extract appid from filename
        const appidMatch = manifestFile.match(/appmanifest_(\d+)\.acf/);
        if (!appidMatch) continue;

        const appid = parseInt(appidMatch[1]);

        // Skip Steam itself and other system apps
        if (appid === 228980 || appid === 7) continue;

        // Parse VDF content to extract game info
        const nameMatch = content.match(/"name"\s+"([^"]+)"/);
        const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
        const sizeMatch = content.match(/"SizeOnDisk"\s+"(\d+)"/);
        const lastUpdatedMatch = content.match(/"LastUpdated"\s+"(\d+)"/);
        const stateMatch = content.match(/"StateFlags"\s+"(\d+)"/);

        if (nameMatch && installDirMatch) {
          const game: SteamGame = {
            appid,
            name: nameMatch[1],
            installDir: join(libraryPath, "steamapps", "common", installDirMatch[1]),
            sizeOnDisk: sizeMatch ? parseInt(sizeMatch[1]) : 0,
            lastUpdated: lastUpdatedMatch ? parseInt(lastUpdatedMatch[1]) : undefined,
            state: stateMatch ? parseInt(stateMatch[1]) : undefined,
          };
          games.push(game);
        }
      } catch (error) {
        console.error(`Error parsing manifest ${manifestFile}:`, error);
        continue;
      }
    }

    return games;
  } catch (error) {
    console.error("Error parsing app manifests:", error);
    return [];
  }
}

/**
 * Get all installed Steam games
 */
export async function getInstalledSteamGames(): Promise<SteamLibraryInfo> {
  try {
    const steamPath = await getSteamPath();
    if (!steamPath) {
      throw new Error("Steam installation not found");
    }

    console.log(`Steam path found: ${steamPath}`);
    const libraryPaths = await getSteamLibraryPaths(steamPath);
    console.log(`Library paths found: ${libraryPaths.join(", ")}`);

    const allGames: SteamGame[] = [];

    for (const libraryPath of libraryPaths) {
      console.log(`Scanning library: ${libraryPath}`);
      const games = await parseAppManifests(libraryPath);
      console.log(`Found ${games.length} games in ${libraryPath}`);
      allGames.push(...games);
    }

    // Remove duplicates and sort by name
    const uniqueGames = allGames
      .filter((game, index, self) => index === self.findIndex((g) => g.appid === game.appid))
      .sort((a, b) => a.name.localeCompare(b.name));

    const totalSize = uniqueGames.reduce((sum, game) => sum + game.sizeOnDisk, 0);

    console.log(`Total unique games found: ${uniqueGames.length}`);

    return {
      games: uniqueGames,
      totalSize,
      gameCount: uniqueGames.length,
    };
  } catch (error) {
    console.error("Error getting installed Steam games:", error);
    throw error;
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format timestamp to relative time
 */
export function formatLastUpdated(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  const days = Math.floor(diff / (24 * 60 * 60));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
