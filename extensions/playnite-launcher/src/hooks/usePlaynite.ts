import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { homedir } from "os";
import { join } from "path";
import { readFile, access } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const removeBOM = (source: string) => source.replace(/^\uFEFF/, "");
const execAsync = promisify(exec);

interface PlayniteGameSource {
  Id: string;
  Name: string;
}

interface PlayniteGameReleaseDate {
  Date: string;
  Day: number;
  Month: number;
  Year: number;
}

export interface PlayniteGame {
  Id: string;
  Name: string;
  Icon?: string | null;
  InstallDirectory?: string | null;
  IsInstalled: boolean;
  Source: PlayniteGameSource;
  ReleaseDate?: PlayniteGameReleaseDate;
  Playtime: number;
  Hidden: boolean;
}

function getPlayniteLibraryPath(): string {
  const appDataPath = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
  return join(appDataPath, "Playnite", "ExtensionsData", "FlowLauncherExporter", "library.json");
}

function getPlayniteIconPath(iconPath: string): string {
  const appDataPath = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
  const fullPath = join(appDataPath, "Playnite", "library", "files", iconPath);
  return `file://${fullPath.replace(/\\/g, "/")}`;
}

async function loadPlayniteGames(includeHidden: boolean): Promise<PlayniteGame[]> {
  const libraryPath = getPlayniteLibraryPath();

  try {
    await access(libraryPath);
  } catch {
    throw new Error(
      "FlowLauncherExporter addon not found. Please install it from https://github.com/Garulf/FlowLauncherExporter/releases/latest",
    );
  }

  try {
    const libraryData = JSON.parse(removeBOM(await readFile(libraryPath, "utf-8"))) as PlayniteGame[];

    return libraryData
      .filter((game) => includeHidden || !game.Hidden)
      .map((game) => ({
        ...game,
        Icon: game.Icon ? getPlayniteIconPath(game.Icon) : null,
      }));
  } catch (error) {
    throw new Error(`Failed to load Playnite library: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function usePlaynite() {
  const preferences = getPreferenceValues();
  const {
    data: games = [],
    isLoading,
    error: loadError,
  } = useCachedPromise(
    async (includeHidden: boolean) => {
      return await loadPlayniteGames(includeHidden);
    },
    [preferences.includeHidden],
    {
      initialData: [],
      onError: async (error) => {
        if (error.message === "ADDON_NOT_FOUND") {
          return;
        }
        await showFailureToast(error, {
          title: "Failed to load Playnite library",
        });
      },
    },
  );

  const error =
    loadError?.message === "ADDON_NOT_FOUND"
      ? "Please install the FlowLauncherExporter addon from:\nhttps://github.com/Garulf/FlowLauncherExporter/releases/latest"
      : loadError
        ? "Failed to load Playnite library"
        : null;

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
    games,
    isLoading,
    error,
    launchGame,
    viewInPlaynite,
    openInstallFolder,
    defaultFilter: preferences.defaultFilter,
  };
}
