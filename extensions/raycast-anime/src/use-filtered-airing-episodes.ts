import { useCachedPromise } from "@raycast/utils";
import { ReactNode, useState } from "react";

import { AiringEpisode, getAiringEpisodes, hasStreamingPlatform, StreamingPlatformFilter } from "./anilist";
import { ResolvedPreferences, usePreferencesGate } from "./preferences";

export type TimestampRange = {
  startTimestamp: number;
  endTimestamp: number;
};

type FilteredAiringEpisodes = {
  filter: StreamingPlatformFilter;
  setFilter: (filter: StreamingPlatformFilter) => void;
  filteredEpisodes: AiringEpisode[];
  error: Error | undefined;
  isLoading: boolean;
  retryEpisodes: () => void;
};

type AiringEpisodesCommandResult =
  | { status: "gate"; view: ReactNode }
  | ({ status: "ready" } & ResolvedPreferences & FilteredAiringEpisodes);

export function useFilteredAiringEpisodes(timestamps: TimestampRange): FilteredAiringEpisodes {
  const [filter, setFilter] = useState<StreamingPlatformFilter>("all");
  const { startTimestamp, endTimestamp } = timestamps;
  const {
    data = [],
    error,
    isLoading,
    revalidate: retryEpisodes,
  } = useCachedPromise(getAiringEpisodes, [startTimestamp, endTimestamp]);
  const filteredEpisodes = data.filter((episode) => hasStreamingPlatform(episode.media, filter));

  return { filter, setFilter, filteredEpisodes, error, isLoading, retryEpisodes };
}

export function useAiringEpisodesCommand(timestamps: TimestampRange): AiringEpisodesCommandResult {
  const preferencesGate = usePreferencesGate();
  const airing = useFilteredAiringEpisodes(timestamps);

  if (preferencesGate.status === "gate") {
    return { status: "gate", view: preferencesGate.view };
  }

  return {
    status: "ready",
    preferences: preferencesGate.preferences,
    revalidate: preferencesGate.revalidate,
    isLoadingPreferences: preferencesGate.isLoadingPreferences,
    ...airing,
  };
}
