import {
  List,
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  open,
} from "@raycast/api";
import { execSync } from "child_process";
import { useState, useEffect } from "react";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fetchGameLibrary } from "./gfn-api";
import { getAccessToken } from "./auth";

// error

type ErrorType = "not_logged_in" | "no_games" | "gfn_not_installed" | "network_error" | "unknown_error";

const ERROR_MESSAGES: Record<ErrorType, string> = {
  not_logged_in: "No API key found. log in again",
  no_games: "No games found.",
  gfn_not_installed: "GeForce NOW not installed.",
  network_error: "Network error.",
  unknown_error: "Unknown error.",
};

// idk raycast weird, but this is how we get error messages to show up in the UI instead of just "Unknown error"

function getErrorMessage(error: ErrorType): string {
  return ERROR_MESSAGES[error] || "Unknown error.";
}

interface Game {
  title: string;
  id: string;
  cmsId: string;
  shortName: string;
  parentGameId: string;
  source: "api" | "shortcut";
  shortcutPath?: string;
}

interface LoadResult {
  games: Game[];
  error: ErrorType | null;
}

const PLATFORM = os.platform();
const IS_WINDOWS = PLATFORM === "win32";

// gets the local shortcut and streamer paths for Windows

function getPathsForPlatform() {
  if (!IS_WINDOWS) {
    throw new Error("The GeForce NOW extension is only supported on Windows.");
  }

  const userProfile = process.env.USERPROFILE || os.homedir();
  const appData = process.env.APPDATA || path.join(userProfile, "AppData", "Roaming");
  const programData = process.env.PROGRAMDATA || "C:\\ProgramData";

  return {
    gamesShortcutsDir: path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "NVIDIA Corporation", "Games"),
    gamesShortcutsDirs: [
      path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "NVIDIA Corporation", "Games"),
      path.join(programData, "Microsoft", "Windows", "Start Menu", "Programs", "NVIDIA Corporation", "Games"),
    ],
    streamerPaths: [
      path.join(userProfile, "AppData", "Local", "NVIDIA Corporation", "GeforceNowInstallerFiles", "GeforceNOW", "CEF", "GeForceNOWStreamer.exe"),
      path.join(programData, "NVIDIA Corporation", "GeforceNowInstallerFiles", "GeforceNOW", "CEF", "GeForceNOWStreamer.exe"),
    ],
  };
}

const { gamesShortcutsDir, gamesShortcutsDirs, streamerPaths } = getPathsForPlatform();
const SHORTCUTS_DIRS = gamesShortcutsDirs;

// finds GeForceNOWstreamer.exe

function findGFNStreamer(): string | null {
  return streamerPaths.find((streamerPath) => fs.existsSync(streamerPath)) || null;
}

// cleans the title 

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*®™©]/g, "")
    .replace(/[^\w\s\-.()\[\]]/g, "")
    .trim();
}

// makes a game item from a shortcut file

function buildGameFromShortcut(fileName: string, directory: string): Game {
  const shortcutPath = path.join(directory, fileName);
  const title = path.basename(fileName, path.extname(fileName)).replace(/\s+on GeForce NOW$/i, "");

  return {
    id: shortcutPath.toLowerCase(),
    title,
    shortcutPath,
    source: "shortcut",
    cmsId: "",
    shortName: "",
    parentGameId: "",
  };
}

// loads existing shortcuts 

function loadGamesFromShortcuts(): Game[] {
  const games: Game[] = [];

  for (const directory of SHORTCUTS_DIRS) {
    if (!directory || !fs.existsSync(directory)) {
      continue;
    }

    try {
      const files = fs.readdirSync(directory);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext !== ".url" && ext !== ".lnk") {
          continue;
        }

        const base = path.basename(file, ext);
        if (!/\s+on\s+GeForce\s+NOW$/i.test(base)) {
          continue;
        }

        games.push(buildGameFromShortcut(file, directory));
      }
    } catch {
      continue;
    }
  }

  return games;
}

// creates a shortcut

async function createShortcut(game: Game): Promise<string> {
  const shortcutName = `${sanitizeFilename(game.title)} on GeForce NOW.lnk`;
  const shortcutPath = path.join(gamesShortcutsDir, shortcutName);

  if (!fs.existsSync(gamesShortcutsDir)) {
    fs.mkdirSync(gamesShortcutsDir, { recursive: true });
  }

  const streamer = findGFNStreamer();
  if (!streamer) {
    throw new Error("GeForce NOW is not installed.");
  }

  // Escape single quotes for safe insertion into PowerShell single-quoted literals
  const escapeForPowerShell = (s: string) => s.replace(/'/g, "''");

  const urlRoute = `#?cmsId=${game.cmsId}&launchSource=External&shortName=${game.shortName || ""}&parentGameId=${game.parentGameId}`;
  const urlRouteEsc = escapeForPowerShell(urlRoute);
  const shortcutPathEsc = escapeForPowerShell(shortcutPath);
  const streamerEsc = escapeForPowerShell(streamer);

  const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortCut('${shortcutPathEsc}')
$shortcut.TargetPath = '${streamerEsc}'
$shortcut.Arguments = '--url-route="${urlRouteEsc}"'
$shortcut.IconLocation = '${streamerEsc}'
$shortcut.Save()
`;

  const tempDir = path.join(os.tmpdir(), "raycast-gfn");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const scriptPath = path.join(tempDir, `create-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, psScript, "utf8");

  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: "pipe" });
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch {
      // ignore
    }
  }

  return shortcutPath;
}

// lauunches w/ shortcut 

async function launchGame(game: Game): Promise<void> {
  if (game.source === "api") {
    if (game.shortcutPath) {
      await open(game.shortcutPath);
      return;
    }

    const shortcutPath = await createShortcut(game);
    await open(shortcutPath);
    return;
  }

  await open(game.shortcutPath!);
}

// merges api and shortcut 

async function loadGames(): Promise<LoadResult> {
  const gameMap = new Map<string, Game>();
  const streamerExists = findGFNStreamer() !== null;
  const accessToken = getAccessToken();

  if (!accessToken) {
    return { games: [], error: "not_logged_in" };
  }

  let apiFetchError: ErrorType | null = null;

  try {
    const apiGames = await fetchGameLibrary();
    for (const apiGame of apiGames) {
      const key = sanitizeFilename(apiGame.title).toLowerCase().trim();
      gameMap.set(key, {
        id: apiGame.id,
        title: apiGame.title,
        cmsId: apiGame.cmsId || apiGame.id,
        shortName: apiGame.shortName || apiGame.id,
        parentGameId: apiGame.parentGameId || apiGame.id,
        source: "api",
      });
    }
  } catch (error) {
    const apiError = error instanceof Error ? error : new Error(String(error));

    if (!streamerExists && apiError.message.includes("404")) {
      return { games: [], error: "gfn_not_installed" };
    }

    if (apiError.message === "auth") {
      return { games: [], error: "not_logged_in" };
    }

    apiFetchError = apiError.message === "network" ? "network_error" : "unknown_error";
  }

  for (const shortcutGame of loadGamesFromShortcuts()) {
    const key = sanitizeFilename(shortcutGame.title).toLowerCase().trim();
    const existing = gameMap.get(key);
    if (existing) {
      existing.shortcutPath = shortcutGame.shortcutPath;
    } else {
      gameMap.set(key, shortcutGame);
    }
  }

  const games = Array.from(gameMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  if (games.length === 0) {
    return { games: [], error: streamerExists ? "no_games" : "gfn_not_installed" };
  }

  return { games, error: null };
}

// idk raycast weird 2 

export default function Command() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await loadGames();
        setGames(result.games);
        setLoadError(result.error ? getErrorMessage(result.error) : null);

        if (result.error && result.games.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Library load issue",
            message: getErrorMessage(result.error),
          });
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : String(error));
        setGames([]);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  if (!isLoading && games.length === 0) {
    const errorMessage = loadError || ERROR_MESSAGES.no_games;
    return <Detail markdown={`## No games found\n\n${errorMessage}`} />;
  }

  // main UI 
  
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your GeForce NOW games...">
      {games.map((game) => (
        <List.Item
          key={game.id}
          title={game.title}
          accessories={[{ text: game.source === "api" ? "Library" : "Shortcut", tooltip: `Source: ${game.source}` }]}
          actions={
            <ActionPanel>
              <Action
                title="Launch Game"
                onAction={async () => {
                  await showToast({ style: Toast.Style.Animated, title: `Launching ${game.title}...` });
                  try {
                    await launchGame(game);
                    await popToRoot();
                  } catch (error) {
                    await showToast({ style: Toast.Style.Failure, title: "Launch Failed", message: error instanceof Error ? error.message : String(error) });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
