import { PlayniteError, PlayniteErrorCode } from "./errors";
import { readFile, access } from "node:fs/promises";
import type { PlayniteGame } from "./types";
import { existsSync } from "node:fs";
import { removeBOM } from "./utils";
import { homedir } from "node:os";
import { join } from "node:path";

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

export async function loadPlayniteGames(
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
