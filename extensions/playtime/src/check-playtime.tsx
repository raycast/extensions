import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  Color,
  Clipboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir, platform } from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
  img_logo_url?: string;
  fileSize?: number; // in bytes
}

interface SteamGamesResponse {
  response: {
    game_count: number;
    games: Game[];
  };
}

// Get Steam game library image URL (larger portrait image - 2x resolution)
function getSteamHeaderImage(appid: number): string {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900_2x.jpg`;
}

// Launch a Steam game
async function launchGame(appid: number): Promise<void> {
  const osPlatform = platform();
  const steamUri = `steam://rungameid/${appid}`;

  try {
    if (osPlatform === "darwin") {
      // macOS
      await execFileAsync("open", [steamUri]);
    } else if (osPlatform === "win32") {
      // Windows
      await execFileAsync("cmd", ["/c", "start", "", steamUri]);
    } else {
      // Linux
      await execFileAsync("xdg-open", [steamUri]);
    }
  } catch (error) {
    throw new Error(
      "Failed to launch game. Make sure Steam is installed and running.",
    );
  }
}

// Get the installation path for a Steam game
async function getGameInstallPath(appid: number): Promise<string | null> {
  const steamPaths = getSteamUserdataPaths();

  // Check for appmanifest files which indicate installation
  for (const steamPath of steamPaths) {
    // Go up from userdata to steamapps
    const steamappsPath = join(steamPath, "..", "steamapps");

    try {
      // Check for appmanifest file in main steamapps
      const manifestPath = join(steamappsPath, `appmanifest_${appid}.acf`);
      await fs.access(manifestPath);
      // Read manifest to get install directory
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const installDirMatch = manifestContent.match(/"installdir"\s+"([^"]+)"/);
      if (installDirMatch) {
        return join(steamappsPath, "common", installDirMatch[1]);
      }
    } catch {
      // Also check commonlibraryfolders.vdf for library folders
      try {
        const libraryFoldersPath = join(steamappsPath, "libraryfolders.vdf");
        const content = await fs.readFile(libraryFoldersPath, "utf-8");
        // Check if appid is mentioned in library folders
        if (content.includes(`"${appid}"`)) {
          // Find the library folder containing this game
          const libraryFolders = content.match(/"path"\s+"([^"]+)"/g);
          if (libraryFolders) {
            for (const folderMatch of libraryFolders) {
              const folderPath = folderMatch.match(/"path"\s+"([^"]+)"/)?.[1];
              if (folderPath) {
                const manifestPath = join(
                  folderPath,
                  "steamapps",
                  `appmanifest_${appid}.acf`,
                );
                try {
                  await fs.access(manifestPath);
                  // Read manifest to get install directory
                  const manifestContent = await fs.readFile(
                    manifestPath,
                    "utf-8",
                  );
                  const installDirMatch = manifestContent.match(
                    /"installdir"\s+"([^"]+)"/,
                  );
                  if (installDirMatch) {
                    return join(
                      folderPath,
                      "steamapps",
                      "common",
                      installDirMatch[1],
                    );
                  }
                } catch {
                  continue;
                }
              }
            }
          }
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

// Calculate directory size recursively
async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    let totalSize = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          totalSize += await getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      } catch {
        // Skip files/directories we can't access
        continue;
      }
    }

    return totalSize;
  } catch {
    return 0;
  }
}

// Check if a Steam game is installed locally
async function isGameInstalled(appid: number): Promise<boolean> {
  const installPath = await getGameInstallPath(appid);
  return installPath !== null;
}

// Quick check to see if any games are installed (by looking for appmanifest files)
async function hasAnyInstalledGames(): Promise<boolean> {
  const steamPaths = getSteamUserdataPaths();

  for (const steamPath of steamPaths) {
    const steamappsPath = join(steamPath, "..", "steamapps");

    try {
      const entries = await fs.readdir(steamappsPath);
      // Check if there are any appmanifest files
      const hasManifest = entries.some(
        (entry) => entry.startsWith("appmanifest_") && entry.endsWith(".acf"),
      );
      if (hasManifest) {
        return true;
      }

      // Also check library folders
      try {
        const libraryFoldersPath = join(steamappsPath, "libraryfolders.vdf");
        const content = await fs.readFile(libraryFoldersPath, "utf-8");
        const libraryFolders = content.match(/"path"\s+"([^"]+)"/g);
        if (libraryFolders) {
          for (const folderMatch of libraryFolders) {
            const folderPath = folderMatch.match(/"path"\s+"([^"]+)"/)?.[1];
            if (folderPath) {
              const librarySteamappsPath = join(folderPath, "steamapps");
              try {
                const libraryEntries = await fs.readdir(librarySteamappsPath);
                const hasLibraryManifest = libraryEntries.some(
                  (entry) =>
                    entry.startsWith("appmanifest_") && entry.endsWith(".acf"),
                );
                if (hasLibraryManifest) {
                  return true;
                }
              } catch {
                continue;
              }
            }
          }
        }
      } catch {
        continue;
      }
    } catch {
      continue;
    }
  }

  return false;
}

// Get file size for an installed game
async function getGameFileSize(appid: number): Promise<number | null> {
  const installPath = await getGameInstallPath(appid);
  if (!installPath) {
    return null;
  }

  try {
    return await getDirectorySize(installPath);
  } catch {
    return null;
  }
}

// Uninstall a Steam game
async function uninstallGame(appid: number, gameName: string): Promise<void> {
  const osPlatform = platform();
  const steamUri = `steam://uninstall/${appid}`;

  // Check if game is installed first
  const installed = await isGameInstalled(appid);
  if (!installed) {
    throw new Error(`${gameName} is not installed on this computer.`);
  }

  try {
    if (osPlatform === "darwin") {
      // macOS
      await execFileAsync("open", [steamUri]);
    } else if (osPlatform === "win32") {
      // Windows
      await execFileAsync("cmd", ["/c", "start", "", steamUri]);
    } else {
      // Linux
      await execFileAsync("xdg-open", [steamUri]);
    }
  } catch (error) {
    throw new Error(
      "Failed to open uninstall dialog. Make sure Steam is installed and running.",
    );
  }
}

function formatPlaytime(
  minutes: number,
  format: "hours" | "days" = "hours",
): string {
  if (minutes === 0) return "Never played";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (format === "days") {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    // If less than a day, show hours
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  // Default: show total hours
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Parse VDF (Valve Data Format) file - simple parser for localconfig.vdf
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVDF(content: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack: any[] = [result];
  let current = result;
  let key = "";
  let inQuotes = false;
  let currentValue = "";

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"' && (i === 0 || content[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
      if (!inQuotes && currentValue) {
        if (!key) {
          key = currentValue;
        } else {
          current[key] = currentValue;
          key = "";
          currentValue = "";
        }
      }
    } else if (inQuotes) {
      currentValue += char;
    } else if (char === "{") {
      if (key) {
        current[key] = {};
        stack.push(current);
        current = current[key];
        key = "";
      }
    } else if (char === "}") {
      if (stack.length > 1) {
        current = stack.pop()!;
      }
    } else if (
      char === "\n" ||
      char === "\r" ||
      char === "\t" ||
      char === " "
    ) {
      // Skip whitespace
    }
  }

  return result;
}

// Get possible Steam userdata paths based on platform
function getSteamUserdataPaths(): string[] {
  const paths: string[] = [];
  const osPlatform = platform();

  if (osPlatform === "darwin") {
    // macOS
    paths.push(
      join(homedir(), "Library", "Application Support", "Steam", "userdata"),
    );
  } else if (osPlatform === "win32") {
    // Windows - check multiple common locations
    const localAppData = process.env.LOCALAPPDATA;
    const programFiles =
      process.env["ProgramFiles(x86)"] || process.env.ProgramFiles;
    const programFilesX86 = process.env["ProgramFiles(x86)"];

    if (localAppData) {
      paths.push(join(localAppData, "Steam", "userdata"));
    }
    if (programFilesX86) {
      paths.push(join(programFilesX86, "Steam", "userdata"));
    }
    if (programFiles && programFiles !== programFilesX86) {
      paths.push(join(programFiles, "Steam", "userdata"));
    }
    // Also check AppData (less common but possible)
    const appData = process.env.APPDATA;
    if (appData) {
      paths.push(join(appData, "Steam", "userdata"));
    }
  } else {
    // Linux
    paths.push(join(homedir(), ".steam", "steam", "userdata"));
    paths.push(join(homedir(), ".local", "share", "Steam", "userdata"));
  }

  return paths;
}

// Find Steam userdata directory and get Steam ID
async function findSteamId(): Promise<string | null> {
  const steamPaths = getSteamUserdataPaths();

  for (const steamPath of steamPaths) {
    try {
      const entries = await fs.readdir(steamPath, { withFileTypes: true });
      // Find the first directory that looks like a Steam ID (numeric)
      for (const entry of entries) {
        if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
          // Check if it has a config directory
          const configPath = join(steamPath, entry.name, "config");
          try {
            await fs.access(configPath);
            return entry.name;
          } catch {
            continue;
          }
        }
      }
    } catch (error) {
      // This path doesn't exist, try next one
      continue;
    }
  }

  return null;
}

// Read playtime from local Steam files
async function readLocalPlaytime(
  steamId: string,
): Promise<Map<number, number>> {
  const steamPaths = getSteamUserdataPaths();
  const playtimeMap = new Map<number, number>();

  // Try each possible Steam path until we find the config file
  for (const steamPath of steamPaths) {
    const localconfigPath = join(
      steamPath,
      steamId,
      "config",
      "localconfig.vdf",
    );

    try {
      const content = await fs.readFile(localconfigPath, "utf-8");
      const config = parseVDF(content);

      // Navigate through the VDF structure to find playtime data
      // Structure is typically: Software -> Valve -> Steam -> Apps -> {appid} -> Playtime
      const apps = config?.Software?.Valve?.Steam?.Apps;
      if (apps) {
        for (const [appidStr, appData] of Object.entries(apps)) {
          const appid = parseInt(appidStr, 10);
          if (!isNaN(appid) && appData && typeof appData === "object") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const playtime = (appData as any).Playtime;
            if (playtime !== undefined) {
              playtimeMap.set(appid, parseInt(playtime, 10) || 0);
            }
          }
        }
      }

      // If we successfully read the file, we're done
      if (playtimeMap.size > 0) {
        return playtimeMap;
      }
    } catch (error) {
      // File doesn't exist at this path, try next one
      continue;
    }
  }

  return playtimeMap;
}

// Fetch game names and file sizes from Steam API (no API key needed for public profiles)
async function fetchGameInfo(
  appids: number[],
): Promise<{ names: Map<number, string>; fileSizes: Map<number, number> }> {
  const nameMap = new Map<number, string>();
  const fileSizeMap = new Map<number, number>();

  // Steam Store API doesn't require an API key
  // We'll fetch game info in batches
  const batchSize = 20;
  for (let i = 0; i < appids.length; i += batchSize) {
    const batch = appids.slice(i, i + batchSize);
    const appidsStr = batch.join(",");

    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appidsStr}&filters=basic`,
      );
      const data = await response.json();

      for (const appid of batch) {
        const appData = data[appid.toString()];
        if (appData?.success && appData?.data) {
          if (appData.data.name) {
            nameMap.set(appid, appData.data.name);
          }
          // File size is in the pc_requirements or package_groups, but more reliably in the header
          // Try to get it from the package_groups or use a fallback
          if (appData.data.pc_requirements?.minimum) {
            // File size might be in system requirements, but it's not always available
            // We'll need to parse it if available
          }
          // Steam Store API doesn't directly provide file size in the basic filter
          // We'd need to parse it from the store page or use a different endpoint
        }
      }
    } catch (error) {
      console.error(`Error fetching info for batch:`, error);
    }
  }

  return { names: nameMap, fileSizes: fileSizeMap };
}

// Try to fetch from Steam API (works for public profiles without API key)
async function fetchSteamGamesAPI(
  steamId: string,
  apiKey?: string,
): Promise<Game[]> {
  const url = apiKey
    ? `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true&include_played_free_games=true`
    : `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?steamid=${steamId}&format=json&include_appinfo=true&include_played_free_games=true`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      throw new Error(
        "Profile is private. Please set your Steam profile to public, or add an API key in preferences.",
      );
    }
    throw new Error(`Failed to fetch games: ${response.statusText}`);
  }

  const data: SteamGamesResponse = await response.json();

  if (!data.response || !data.response.games) {
    throw new Error("No games found or invalid response from Steam API");
  }

  return data.response.games.sort(
    (a, b) => b.playtime_forever - a.playtime_forever,
  );
}

// Main function to get games - tries local files first, then API
async function getSteamGames(
  apiKey?: string,
  steamId?: string,
): Promise<Game[]> {
  // Try local files first (no setup needed)
  try {
    const detectedSteamId = steamId || (await findSteamId());
    if (detectedSteamId) {
      const playtimeMap = await readLocalPlaytime(detectedSteamId);

      if (playtimeMap.size > 0) {
        const appids = Array.from(playtimeMap.keys());
        const { names: nameMap } = await fetchGameInfo(appids);

        const games: Game[] = appids
          .map((appid) => ({
            appid,
            name: nameMap.get(appid) || `App ${appid}`,
            playtime_forever: playtimeMap.get(appid) || 0,
          }))
          .filter(
            (game) => game.playtime_forever > 0 || nameMap.has(game.appid),
          ) // Only show games with playtime or known names
          .sort((a, b) => b.playtime_forever - a.playtime_forever);

        if (games.length > 0) {
          return games;
        }
      }
    }
  } catch (error) {
    console.error("Error reading local files:", error);
    // Fall through to API method
  }

  // Fallback to API (requires Steam ID, API key optional for public profiles)
  if (steamId) {
    return await fetchSteamGamesAPI(steamId, apiKey);
  }

  throw new Error(
    "Could not find Steam installation. Please provide your Steam ID in preferences, or ensure Steam is installed.",
  );
}

// Component for game action panel that checks installation status on-demand
function GameActionPanel({
  game,
  totalPlaytime,
  installedGames,
  actionInstallationCache,
  setActionInstallationCache,
  revalidate,
}: {
  game: Game;
  totalPlaytime: string;
  installedGames?: Set<number>;
  actionInstallationCache: Map<number, boolean>;
  setActionInstallationCache: React.Dispatch<
    React.SetStateAction<Map<number, boolean>>
  >;
  revalidate: () => void;
}) {
  // Use cached installation status if available, or check from installedGames if filter is active
  // If we have installation data from the filter, use it
  const hasFilterData = installedGames !== undefined;
  const isInstalledFromFilter = installedGames?.has(game.appid);
  const cachedIsInstalled = actionInstallationCache.get(game.appid);

  // Determine if game is installed
  const isInstalled = hasFilterData ? isInstalledFromFilter : cachedIsInstalled;

  // Check installation status on-demand if not already cached and filter is not active
  useEffect(() => {
    if (!hasFilterData && !actionInstallationCache.has(game.appid)) {
      isGameInstalled(game.appid).then((installed) => {
        setActionInstallationCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(game.appid, installed);
          return newCache;
        });
      });
    }
  }, [game.appid, hasFilterData]);

  return (
    <ActionPanel>
      {isInstalled && (
        <Action
          title="Launch Game"
          icon={Icon.Rocket}
          onAction={async () => {
            try {
              await launchGame(game.appid);
              await showToast({
                style: Toast.Style.Success,
                title: "Launching game",
                message: game.name,
              });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to launch game",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
            }
          }}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
      )}
      <Action
        title="Copy Playtime"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(totalPlaytime);
          await showToast({
            style: Toast.Style.Success,
            title: "Copied playtime",
            message: `${game.name}: ${totalPlaytime}`,
          });
        }}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {isInstalled && (
        <Action
          title="Uninstall Game"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            try {
              await uninstallGame(game.appid, game.name);
              await showToast({
                style: Toast.Style.Success,
                title: "Opening uninstall dialog",
                message: `Steam will open the uninstall dialog for ${game.name}`,
              });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Cannot uninstall",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
            }
          }}
        />
      )}
      <Action.OpenInBrowser
        url={`https://store.steampowered.com/app/${game.appid}`}
        title="View on Steam"
        icon={Icon.Globe}
      />
      <Action
        title="Refresh Library"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Open Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.CheckPlaytime>();
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<string>("playtime");

  const {
    data: games,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      return await getSteamGames(
        preferences.steamApiKey || undefined,
        preferences.steamId || undefined,
      );
    },
    [],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load games",
          message: error.message,
        });
      },
    },
  );

  const filteredGames =
    games?.filter((game) =>
      game.name.toLowerCase().includes(searchText.toLowerCase()),
    ) || [];

  // Calculate total playtime across all games
  const totalPlaytimeMinutes =
    games?.reduce((sum, game) => sum + game.playtime_forever, 0) || 0;
  const timeFormat =
    (preferences.timeDisplayFormat as "hours" | "days") || "hours";
  const totalPlaytimeFormatted = formatPlaytime(
    totalPlaytimeMinutes,
    timeFormat,
  );

  // Check installation status and file sizes - only when needed for specific filters
  // Installation status is only checked when "installed" filter is selected
  // File sizes are only checked when "filesize" filter is selected
  const needsInstallationCheck = sortBy === "installed";
  const needsFileSizeCheck = sortBy === "filesize";
  const { data: gameMetadata, isLoading: isLoadingMetadata } = usePromise(
    async () => {
      if (!games || (!needsInstallationCheck && !needsFileSizeCheck)) {
        return {
          installed: new Set<number>(),
          fileSizes: new Map<number, number>(),
        };
      }
      const installed = new Set<number>();
      const fileSizes = new Map<number, number>();

      // Check installation status only if needed for "installed" filter
      // Check file sizes only if needed for "filesize" filter
      const checks = games.map(async (game) => {
        try {
          // Only check installation if needed for sorting
          if (needsInstallationCheck) {
            const isInstalled = await isGameInstalled(game.appid);
            if (isInstalled) {
              installed.add(game.appid);
            }
          }

          // Only check file size if needed for sorting
          if (needsFileSizeCheck) {
            try {
              const isInstalled = await isGameInstalled(game.appid);
              if (isInstalled) {
                const size = await getGameFileSize(game.appid);
                if (size !== null && size > 0) {
                  fileSizes.set(game.appid, size);
                }
              }
            } catch {
              // Silently skip file size calculation if it fails
            }
          }
        } catch {
          // Silently skip installation check if it fails
        }
      });
      await Promise.all(checks);
      return { installed, fileSizes };
    },
    [games, needsInstallationCheck, needsFileSizeCheck],
    {
      onError: (error) => {
        // Silently handle metadata errors - they're not critical
        console.error("Error checking game metadata:", error);
      },
    },
  );

  // For actions, we'll check installation status on-demand
  const [actionInstallationCache, setActionInstallationCache] = useState<
    Map<number, boolean>
  >(new Map());

  // Check if any games are installed (to conditionally show filter options)
  const { data: hasInstalledGames } = usePromise(async () => {
    try {
      return await hasAnyInstalledGames();
    } catch {
      // If check fails, assume no games are installed
      return false;
    }
  }, []);

  const installedGames = gameMetadata?.installed;
  const gameFileSizes = gameMetadata?.fileSizes;

  // Reset sort to "playtime" if "installed" or "filesize" is selected but no games are installed
  useEffect(() => {
    if (
      hasInstalledGames === false &&
      (sortBy === "installed" || sortBy === "filesize")
    ) {
      setSortBy("playtime");
    }
  }, [hasInstalledGames, sortBy]);

  // Sort games based on selected option - use useMemo to recalculate when dependencies change
  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "filesize": {
          // Sort by file size (largest first), games without size go to end
          // Use file size from metadata if available, otherwise from game object
          const aSize = gameFileSizes?.get(a.appid) || a.fileSize;
          const bSize = gameFileSizes?.get(b.appid) || b.fileSize;
          if (!aSize && !bSize) return 0;
          if (!aSize) return 1;
          if (!bSize) return -1;
          return bSize - aSize;
        }
        case "installed": {
          // Sort by installation status (installed first), then by playtime
          // Only works if installation check has been performed
          if (installedGames) {
            const aInstalled = installedGames.has(a.appid) ? 1 : 0;
            const bInstalled = installedGames.has(b.appid) ? 1 : 0;
            if (aInstalled !== bInstalled) {
              return bInstalled - aInstalled; // Installed games first
            }
          }
          // If both have same installation status or check not performed, sort by playtime
          return b.playtime_forever - a.playtime_forever;
        }
        case "playtime":
        default:
          return b.playtime_forever - a.playtime_forever;
      }
    });
  }, [filteredGames, sortBy, installedGames, gameFileSizes]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Games"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={
        isLoading ||
        (isLoadingMetadata && (needsInstallationCheck || needsFileSizeCheck))
      }
      searchBarPlaceholder="Search your Steam library..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          defaultValue="playtime"
          onChange={(newValue) => setSortBy(newValue)}
        >
          <List.Dropdown.Item title="Total Hours Played" value="playtime" />
          <List.Dropdown.Item title="Name" value="name" />
          {hasInstalledGames && (
            <>
              <List.Dropdown.Item title="File Size" value="filesize" />
              <List.Dropdown.Item title="Installed" value="installed" />
            </>
          )}
        </List.Dropdown>
      }
    >
      {filteredGames.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No games found"
          description={
            searchText
              ? `No games match "${searchText}"`
              : "No games in your library"
          }
        />
      ) : (
        <>
          <List.Section
            title={
              searchText
                ? `Found ${sortedGames.length} game${sortedGames.length !== 1 ? "s" : ""}`
                : undefined
            }
          >
            {/* Special list item for total library time - only show when not searching */}
            {!searchText && (
              <List.Item
                key="total-library-time"
                title={`Total Library Time (${sortedGames.length} game${sortedGames.length !== 1 ? "s" : ""})`}
                icon={Icon.GameController}
                accessories={[
                  {
                    text: totalPlaytimeFormatted,
                    icon: Icon.Clock,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Copy Total Time"
                      icon={Icon.Clipboard}
                      onAction={async () => {
                        await Clipboard.copy(totalPlaytimeFormatted);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Copied total time",
                          message: totalPlaytimeFormatted,
                        });
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            )}
            {sortedGames.map((game) => {
              const totalPlaytime = formatPlaytime(
                game.playtime_forever,
                timeFormat,
              );
              const recentPlaytime = game.playtime_2weeks
                ? formatPlaytime(game.playtime_2weeks, timeFormat)
                : null;

              // Get file size (from metadata or game object)
              const fileSize = gameFileSizes?.get(game.appid) || game.fileSize;
              const formatFileSize = (bytes: number | undefined): string => {
                if (!bytes) return "";
                const gb = bytes / (1024 * 1024 * 1024);
                if (gb >= 1) return `${gb.toFixed(1)} GB`;
                const mb = bytes / (1024 * 1024);
                return `${mb.toFixed(0)} MB`;
              };
              const fileSizeText = fileSize ? formatFileSize(fileSize) : null;

              return (
                <List.Item
                  key={game.appid}
                  title={game.name}
                  icon={{
                    source: getSteamHeaderImage(game.appid),
                    fallback: Icon.GameController,
                  }}
                  accessories={[
                    ...(recentPlaytime
                      ? [
                          {
                            tag: {
                              value: `Last 2 weeks: ${recentPlaytime}`,
                              color: Color.Blue,
                            },
                          },
                        ]
                      : []),
                    ...(fileSizeText
                      ? [
                          {
                            text: fileSizeText,
                            icon: Icon.HardDrive,
                          },
                        ]
                      : []),
                    {
                      text: totalPlaytime,
                      icon: Icon.Clock,
                    },
                  ]}
                  actions={
                    <GameActionPanel
                      game={game}
                      totalPlaytime={totalPlaytime}
                      installedGames={installedGames}
                      actionInstallationCache={actionInstallationCache}
                      setActionInstallationCache={setActionInstallationCache}
                      revalidate={revalidate}
                    />
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
