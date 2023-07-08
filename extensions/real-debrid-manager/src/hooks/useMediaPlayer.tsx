import { Toast, getApplications, showToast, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { DownloadFileData, SupportedMediaPlayer } from "../schema";
import { parseFileType } from "../utils";

const SUPPORTED_PLAYERS = /(iina|vlc|movist|quicktime)/i;
const SUPPORTED_FILE_TYPES = /(audio|video)/;

export const useMediaPlayer = () => {
  const { data: apps } = usePromise(async () => {
    const result = await getApplications();
    return result;
  });

  const supportedMediaPlayers = useMemo(() => {
    if (!apps) return [];

    return apps
      .filter((app) => app?.bundleId && SUPPORTED_PLAYERS.test(app.bundleId))
      .map((app) => ({
        key: app.name.charAt(0).toLowerCase(),
        ...app,
      }));
  }, [apps]) as SupportedMediaPlayer[];

  const playWithMediaPlayer = async (url: string, mediaPlayer: SupportedMediaPlayer) => {
    try {
      await open(url, mediaPlayer.bundleId);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to Launch Media Player" + error);
    }
  };

  const isDownloadItemPlayable = (downloadItem: DownloadFileData) => {
    return Boolean(SUPPORTED_FILE_TYPES.test(parseFileType(downloadItem)));
  };

  return {
    supportedMediaPlayers,
    playWithMediaPlayer,
    isDownloadItemPlayable,
  };
};
