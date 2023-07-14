import { Toast, getApplications, showToast, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { DownloadItemData, SupportedMediaPlayer } from "../schema";
import { parseFileType } from "../utils";
import { requestGetStreamingInfo } from "../api";

const SUPPORTED_PLAYERS = /(iina|vlc|movist|quicktime)/i;
const SUPPORTED_FILE_TYPES = /(audio|video)/;

export const useStreaming = () => {
  const getStreamingInfo = (
    download_id: string,
    {
      isPlayable,
      isYouTube,
    }: {
      isPlayable?: boolean;
      isYouTube?: boolean;
    } = {}
  ) => {
    return usePromise(requestGetStreamingInfo, [download_id], {
      execute: isPlayable && !isYouTube,
      onWillExecute: async () => {
        await showToast(Toast.Style.Animated, "Fetching metadata");
      },
      onError: async () => {
        await showToast(Toast.Style.Failure, "No metadata");
      },
      onData: async () => {
        await showToast(Toast.Style.Success, "Metadata found");
      },
    });
  };

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

  const isDownloadItemPlayable = (downloadItem: DownloadItemData) => {
    return Boolean(SUPPORTED_FILE_TYPES.test(parseFileType(downloadItem)));
  };

  return {
    getStreamingInfo,
    supportedMediaPlayers,
    playWithMediaPlayer,
    isDownloadItemPlayable,
  };
};
