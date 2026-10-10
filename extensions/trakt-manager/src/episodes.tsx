import { Grid, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { EpisodeActionPanel, episodeTraktUrl } from "./components/episode-actions";
import { GenericGrid } from "./components/generic-grid";
import { RemoveFromHistoryAction } from "./components/history-actions";
import { RatingActions } from "./components/rating-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { createEpisodeMarkdown, createEpisodeMetadata } from "./lib/detail-helpers";
import { getPosterUrl } from "./lib/helper";
import { markEpisodeWatched } from "./lib/media-mutations";
import { TraktShowHistoryListItem } from "./lib/schema";
import { abortSearch, createSearchFetcher } from "./lib/search";
import { useRatingsSync } from "./lib/use-ratings";
import { useWatchedState, useWatchedSync } from "./lib/use-watched";

const episodeTarget = ({ show, episode }: TraktShowHistoryListItem) =>
  ({ type: "episode", showId: show.ids.trakt, season: episode.season, number: episode.number }) as const;

const episodeLabel = ({ show, episode }: TraktShowHistoryListItem) =>
  `${show.title} S${episode.season}E${episode.number}`;

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  useRatingsSync();
  useWatchedSync();
  const { setWatched } = useWatchedState();
  const {
    isLoading,
    data: episodes,
    pagination,
  } = useCachedPromise(
    createSearchFetcher({
      abortable,
      search: traktClient.shows.searchEpisodes,
    }),
    [searchText],
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

  const markWatched = useCallback(async (episode: TraktShowHistoryListItem) => {
    await markEpisodeWatched(traktClient, episode.episode.ids.trakt, { signal: abortable.current?.signal });
    setWatched(episodeTarget(episode), true);
  }, []);
  const signal = () => abortable.current?.signal;

  const handleSearchTextChange = useCallback(abortSearch(abortable, setSearchText), []);
  const handleAction = useActionRunner<TraktShowHistoryListItem>({ setActionLoading });

  const episodeMarkdown = useCallback((episode: TraktShowHistoryListItem) => {
    return createEpisodeMarkdown(episode.episode, episode.show);
  }, []);

  const episodeMetadata = useCallback((episode: TraktShowHistoryListItem) => {
    return createEpisodeMetadata(episode.episode, episode.show);
  }, []);

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="Search for episodes"
      searchBarPlaceholder="Search for episodes"
      onSearchTextChange={handleSearchTextChange}
      pagination={pagination}
      items={episodes}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => `${item.episode.title}`}
      subtitle={(item) => `${item.show.title}`}
      poster={(item) => getPosterUrl(item.show.images, "poster.png")}
      keyFn={(item, index) => `${item.show.ids.trakt}-${item.episode.ids.trakt}-${index}`}
      actions={(item) => (
        <EpisodeActionPanel
          item={item}
          markdown={episodeMarkdown}
          metadata={episodeMetadata}
          navigationTitle={(episode) => episode.episode.title}
          traktUrl={(episode) => episodeTraktUrl(episode.show.ids.slug, episode.episode.season, episode.episode.number)}
          imdbId={(episode) => episode.episode.ids.imdb}
          actions={[
            {
              title: "Mark as Watched",
              icon: Icon.Checkmark,
              onAction: (episode) =>
                handleAction(
                  episode,
                  markWatched,
                  `Marked "${episode.show.title}" S${episode.episode.season}E${episode.episode.number} as watched`,
                ),
            },
          ]}
          extraActions={(episode) => (
            <>
              <RemoveFromHistoryAction
                item={episode}
                target={episodeTarget(episode)}
                traktId={episode.episode.ids.trakt}
                title={episodeLabel(episode)}
                client={traktClient}
                signal={signal}
                run={handleAction}
              />
              <RatingActions
                item={episode}
                type="episode"
                traktId={episode.episode.ids.trakt}
                title={episodeLabel(episode)}
                client={traktClient}
                signal={signal}
                run={handleAction}
              />
            </>
          )}
        />
      )}
    />
  );
}
