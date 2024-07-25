import { Grid, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getEpisodes } from "../api/shows";
import { useEpisodeMutations } from "../hooks/useEpisodeMutations";
import { APP_MAX_LISTENERS } from "../lib/constants";
import { EpisodeGridItem } from "./episode-grid-item";

export const EpisodeGrid = ({
  showId,
  tmdbId,
  seasonNumber,
  slug,
}: {
  showId: number;
  tmdbId: number;
  seasonNumber: number;
  slug: string;
}) => {
  const abortable = useRef<AbortController>();
  const [actionLoading, setActionLoading] = useState(false);
  const { isLoading, data: episodes } = useCachedPromise(
    async (showId: number, seasonNumber: number) => {
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
      return await getEpisodes(showId, seasonNumber, abortable.current?.signal);
    },
    [showId, seasonNumber],
    {
      initialData: undefined,
      keepPreviousData: true,
      abortable,
      onError(error) {
        showToast({
          title: error.message,
          style: Toast.Style.Failure,
        });
      },
    },
  );
  const { checkInEpisodeMutation, error, success } = useEpisodeMutations(abortable);

  const handleAction = useCallback(
    async (episode: TraktEpisodeListItem, action: (episode: TraktEpisodeListItem) => Promise<void>) => {
      setActionLoading(true);
      try {
        await action(episode);
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (success) {
      showToast({
        title: success,
        style: Toast.Style.Success,
      });
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      showToast({
        title: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  return (
    <Grid
      isLoading={isLoading || actionLoading}
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search for episodes"
    >
      {episodes &&
        episodes.map((episode) => (
          <EpisodeGridItem
            key={episode.ids.trakt}
            episode={episode}
            tmdbId={tmdbId}
            seasonNumber={seasonNumber}
            slug={slug}
            checkInEpisodeMutation={() => handleAction(episode, checkInEpisodeMutation)}
          />
        ))}
    </Grid>
  );
};
