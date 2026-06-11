import { Application, getApplications, open, showToast, Toast } from "@raycast/api";
import { Download } from "../types";
import { getDownloadLink } from "../api/downloads";

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".m4v",
  ".mpg",
  ".mpeg",
  ".ts",
  ".vob",
  ".3gp",
]);

export const isVideoFile = (filename: string): boolean => {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.slice(dotIndex).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
};

const PLAYER_KEYWORDS = ["vlc", "iina", "infuse", "mpv"];

export async function findVideoPlayers(): Promise<Application[]> {
  const apps = await getApplications();
  return apps.filter((app) => {
    const name = app.name.toLowerCase();
    return PLAYER_KEYWORDS.some((keyword) => name.includes(keyword));
  });
}

export const openInPlayer = async (apiKey: string, download: Download, player: Application, fileId?: number) => {
  try {
    await showToast({ style: Toast.Style.Animated, title: `Opening in ${player.name}...` });
    const link = await getDownloadLink(apiKey, download.type, download.id, fileId);
    await open(link, player);
    await showToast({ style: Toast.Style.Success, title: `Opened in ${player.name}` });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to open in ${player.name}`,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
