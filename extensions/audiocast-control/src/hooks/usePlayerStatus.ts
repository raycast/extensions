import { usePromise } from "@raycast/utils";
import type { UsePromiseReturnType } from "@raycast/utils/dist/types";
import { useRef } from "react";
import {
  type PlayerStatusSummary,
  type StatusSummary,
  getPlayerStatus,
  getStatus,
  getPlaybackStatus,
} from "../api/player";
import { getDeviceUrl } from "../lib/discover";

export interface PlayerStatus extends StatusSummary, PlayerStatusSummary {
  url: string;
  recording: RecordingSummary | null;
}

export function usePlayerStatus(): UsePromiseReturnType<PlayerStatus> {
  const abortable = useRef<AbortController | null>(null);

  return usePromise(
    async () => {
      const playerUrl = await getDeviceUrl(abortable.current?.signal);

      const [deviceStatus, playerStatus, recording] = await Promise.all([
        getStatus(playerUrl, abortable?.current?.signal),
        getPlayerStatus(playerUrl, abortable?.current?.signal),
        getPlaybackStatus(playerUrl, abortable?.current?.signal),
      ]);

      return {
        ...deviceStatus,
        ...playerStatus,
        recording,
      };
    },
    [],
    {
      abortable,
    },
  );
}
