import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { PlayniteGame } from "../types";
import { execAsync, removeBOM } from "../utils";
import { PlayniteError, PlayniteErrorCode } from "../errors";

function getDefaultPlayniteDataPath(): string | null {
  const appDataPath = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
  const defaultPlayniteDataPath = join(appDataPath, "Playnite");
  // If the user installs Playnite portable, they'll have to manually select the path
  return existsSync(defaultPlayniteDataPath) ? defaultPlayniteDataPath : null;
}

function getPlayniteLibraryPath(customPlayniteDataPath: string | null = null): string | null {
  const playniteDataPath = customPlayniteDataPath ?? getDefaultPlayniteDataPath();
  if (playniteDataPath === null) return null;
  return join(playniteDataPath, "ExtensionsData", "FlowLauncherExporter", "library.json");
}

function getPlayniteIconPath(iconPath: string, customPlayniteDataPath: string | null = null): string | null {
  const playniteDataPath = customPlayniteDataPath ?? getDefaultPlayniteDataPath();
  if (playniteDataPath === null) return null;
  const fullPath = join(playniteDataPath, "library", "files", iconPath);
  return `file://${fullPath.replace(/\\/g, "/")}`;
}

async function loadPlayniteGames(
  includeHidden: boolean,
  customPlayniteDataPath: string | null = null,
): Promise<PlayniteGame[]> {
  const libraryPath = getPlayniteLibraryPath(customPlayniteDataPath);

  if (libraryPath === null) throw new PlayniteError(PlayniteErrorCode.PLAYNITE_PATH_INVALID);

  try {
    await access(libraryPath);
  } catch {
    throw new PlayniteError(PlayniteErrorCode.EXTENSION_MISSING);
  }

  try {
    let libraryData = JSON.parse(removeBOM(await readFile(libraryPath, "utf-8"))) as PlayniteGame[];

    // If the user has only one game the file will only contain an object, not an array.
    if (!Array.isArray(libraryData)) {
      libraryData = [libraryData];
    }

    return libraryData
      .filter((game) => includeHidden || !game.Hidden)
      .map((game) => ({
        ...game,
        Icon: game.Icon ? getPlayniteIconPath(game.Icon, customPlayniteDataPath) : null,
      }));
  } catch (error) {
    throw new PlayniteError(PlayniteErrorCode.UNKNOWN_ERROR, error instanceof Error ? error.message : undefined);
  }
}

export function usePlaynite() {
  const preferences = getPreferenceValues();
  const { data, error, isLoading } = useCachedPromise(
    async (includeHidden: boolean, customPlaynitePath: string | null) => {
      try {
        return {
          games: await loadPlayniteGames(includeHidden, customPlaynitePath),
          error: null,
        };
      } catch (err) {
        if (err instanceof Error) {
          return {
            games: [],
            error: err,
          };
        }
        throw err;
      }
    },
    [preferences.includeHidden, preferences.customPlaynitePath],
    {
      initialData: { error: null, games: [] },
    },
  );

  const launchGame = async (game: PlayniteGame) => {
    try {
      if (!game.IsInstalled) {
        await showFailureToast({
          title: "Game Not Installed",
          message: `${game.Name} is not currently installed`,
        });
        return;
      }

      const url = `playnite://playnite/start/${game.Id}`;
      const command = `cmd /c start "" "${url}"`;
      await execAsync(command);

      await showToast({
        style: Toast.Style.Success,
        title: "Game Launched",
        message: `Starting ${game.Name}`,
      });
    } catch (err) {
      console.error("Failed to launch game:", err);
      await showFailureToast(err, {
        title: "Launch Failed",
        message: `Could not launch ${game.Name}. Make sure Playnite is running.`,
      });
    }
  };

  const viewInPlaynite = async (game: PlayniteGame) => {
    try {
      const url = `playnite://playnite/showgame/${game.Id}`;
      const command = `cmd /c start "" "${url}"`;
      await execAsync(command);

      await showToast({
        style: Toast.Style.Success,
        title: "Opened in Playnite",
        message: `Viewing ${game.Name} details`,
      });
    } catch (err) {
      console.error("Failed to open game in Playnite:", err);
      await showFailureToast(err, {
        title: "Failed to Open",
        message: `Could not view ${game.Name} in Playnite. Make sure Playnite is installed.`,
      });
    }
  };

  const openInstallFolder = async (game: PlayniteGame) => {
    try {
      if (!game.InstallDirectory) {
        await showFailureToast({
          title: "No Install Directory",
          message: `${game.Name} has no known installation directory`,
        });
        return;
      }

      const command = `start "" "${game.InstallDirectory}"`;
      await execAsync(command);

      await showToast({
        style: Toast.Style.Success,
        title: "Folder Opened",
        message: `Opened ${game.Name} install directory`,
      });
    } catch (err) {
      console.error("Failed to open install folder:", err);
      await showFailureToast(err, {
        title: "Failed to Open Folder",
        message: `Could not open ${game.Name} install directory`,
      });
    }
  };

  return {
    data,
    isLoading,
    error,
    launchGame,
    viewInPlaynite,
    openInstallFolder,
    defaultFilter: preferences.defaultFilter,
  };
}
