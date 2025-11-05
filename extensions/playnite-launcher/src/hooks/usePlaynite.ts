import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { loadPlayniteGames } from "../playnite";
import type { PlayniteGame } from "../types";
import { execAsync } from "../utils";

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
