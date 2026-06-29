import { Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { EpisodeActionPanel, episodeTraktUrl } from "./components/episode-actions";
import { GenericGrid } from "./components/generic-grid";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { createEpisodeMarkdown, createEpisodeMetadata } from "./lib/detail-helpers";
import { getPosterUrl } from "./lib/helper";
import { TraktShowHistoryListItem } from "./lib/schema";
import { abortSearch, createSearchFetcher } from "./lib/search";

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
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

  const addEpisodeToHistory = useCallback(async (episode: TraktShowHistoryListItem) => {
    await traktClient.shows.addEpisodeToHistory({
      body: {
        episodes: [
          {
            ids: { trakt: episode.episode.ids.trakt },
            watched_at: new Date().toISOString(),
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const checkInEpisode = useCallback(async (episode: TraktShowHistoryListItem) => {
    await traktClient.shows.checkInEpisode({
      body: {
        episodes: [
          {
            ids: {
              trakt: episode.episode.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
    });
  }, []);

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
              title: "Check-In",
              icon: Icon.Checkmark,
              onAction: (episode) => handleAction(episode, checkInEpisode, "Episode checked-in"),
            },
            {
              title: "Add to History",
              icon: Icon.Clock,
              shortcut: Keyboard.Shortcut.Common.Duplicate,
              onAction: (episode) => handleAction(episode, addEpisodeToHistory, "Episode added to history"),
            },
          ]}
        />
      )}
    />
  );
}
