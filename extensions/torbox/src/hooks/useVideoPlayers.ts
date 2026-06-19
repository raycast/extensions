import { useCallback, useEffect, useState } from "react";
import { Application, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { findVideoPlayers } from "../utils/video";

const STORAGE_KEY = "defaultVideoPlayer";

export function useVideoPlayers() {
  const { data: players = [] } = useCachedPromise(findVideoPlayers);
  const [defaultPlayerName, setDefaultPlayerName] = useState<string | undefined>();

  useEffect(() => {
    LocalStorage.getItem<string>(STORAGE_KEY).then(setDefaultPlayerName);
  }, []);

  const sortedPlayers = defaultPlayerName
    ? [...players].sort((a, b) => {
        if (a.name === defaultPlayerName) return -1;
        if (b.name === defaultPlayerName) return 1;
        return 0;
      })
    : players;

  const setDefaultPlayer = useCallback(async (player: Application) => {
    await LocalStorage.setItem(STORAGE_KEY, player.name);
    setDefaultPlayerName(player.name);
    await showToast({ style: Toast.Style.Success, title: `Default player set to ${player.name}` });
  }, []);

  return { players: sortedPlayers, setDefaultPlayer };
}

export type VideoPlayers = ReturnType<typeof useVideoPlayers>;
