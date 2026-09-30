import { Action, ActionPanel, Grid, Icon, Keyboard } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { type PaginationOptions } from "./lib/pagination";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericDetail } from "./components/generic-detail";
import { GenericGrid } from "./components/generic-grid";
import { MovieActionPanel } from "./components/media-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { createEpisodeMarkdown, createEpisodeMetadata } from "./lib/detail-helpers";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { fetchCombinedMediaPage, fetchMediaPage, mediaListCacheOptions } from "./lib/media-pagination";
import { removeEpisodeFromHistory, removeMovieFromHistory } from "./lib/media-mutations";
import { TraktMovieHistoryListItem, TraktShowHistoryListItem } from "./lib/schema";

type HistoryFilterType = "all" | "movie" | "show";

type HistoryItem =
  { mediaType: "movie"; item: TraktMovieHistoryListItem } | { mediaType: "show"; item: TraktShowHistoryListItem };

const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

const historyQuery = {
  limit: 10,
  extended: "full,cloud9" as const,
};
const combinedHistoryPageLimit = historyQuery.limit * 2;

const sortByWatchedAt = (items: HistoryItem[]) =>
  [...items].sort((a, b) => {
    const aTime = a.item.watched_at ? new Date(a.item.watched_at).getTime() : 0;
    const bTime = b.item.watched_at ? new Date(b.item.watched_at).getTime() : 0;
    return bTime - aTime;
  });

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [mediaType, setMediaType] = useState<HistoryFilterType>("all");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: history,
    pagination,
    revalidate,
  } = useCachedPromise(
    (mediaType: HistoryFilterType) => async (options: PaginationOptions) => {
      await setTimeout(100);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const fetchOptions = { signal: abortable.current.signal };
      const page = options.page + 1;

      if (mediaType === "movie") {
        return fetchMediaPage<"movie", TraktMovieHistoryListItem>("movie", () =>
          traktClient.movies.getMovieHistory({ query: { ...historyQuery, page }, fetchOptions }),
        );
      }

      if (mediaType === "show") {
        return fetchMediaPage<"show", TraktShowHistoryListItem>("show", () =>
          traktClient.shows.getShowHistory({ query: { ...historyQuery, page }, fetchOptions }),
        );
      }

      return fetchCombinedMediaPage<TraktMovieHistoryListItem, TraktShowHistoryListItem>({
        page: options.page,
        perPageLimit: historyQuery.limit,
        combinedPageLimit: combinedHistoryPageLimit,
        requestMoviePage: (page) =>
          traktClient.movies.getMovieHistory({ query: { ...historyQuery, page }, fetchOptions }),
        requestShowPage: (page) => traktClient.shows.getShowHistory({ query: { ...historyQuery, page }, fetchOptions }),
        sort: sortByWatchedAt,
      });
    },
    [mediaType],
    mediaListCacheOptions(abortable),
  );

  const removeMovieFromHistoryAction = useCallback(
    async (movie: TraktMovieHistoryListItem) => {
      await removeMovieFromHistory(traktClient, movie, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const removeEpisodeFromHistoryAction = useCallback(
    async (episode: TraktShowHistoryListItem) => {
      await removeEpisodeFromHistory(traktClient, episode, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const onMediaTypeChange = useCallback((newValue: string) => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setMediaType(newValue as HistoryFilterType);
  }, []);

  const handleMovieAction = useActionRunner<TraktMovieHistoryListItem>({ setActionLoading, onSuccess: revalidate });
  const handleShowAction = useActionRunner<TraktShowHistoryListItem>({ setActionLoading, onSuccess: revalidate });

  const movieActions = useCallback(
    (item: TraktMovieHistoryListItem) => (
      <MovieActionPanel
        item={item}
        actions={[
          {
            title: "Remove from History",
            icon: Icon.Trash,
            shortcut: Keyboard.Shortcut.Common.Remove,
            onAction: (movie) => handleMovieAction(movie, removeMovieFromHistoryAction, "Movie removed from history"),
          },
        ]}
      />
    ),
    [handleMovieAction, removeMovieFromHistoryAction],
  );

  const showActions = useCallback(
    (item: TraktShowHistoryListItem) => (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Push
            icon={Icon.Eye}
            title="View Details"
            target={
              <GenericDetail
                item={item}
                isLoading={false}
                markdown={(item) => createEpisodeMarkdown(item.episode, item.show)}
                metadata={(item) => createEpisodeMetadata(item.episode, item.show)}
                navigationTitle={(item) =>
                  `${item.show.title} - S${item.episode.season}E${item.episode.number.toString().padStart(2, "0")}`
                }
                actions={(item) => (
                  <ActionPanel>
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() =>
                        handleShowAction(item, removeEpisodeFromHistoryAction, "Episode removed from history")
                      }
                    />
                    <Action.OpenInBrowser
                      icon={getFavicon(TRAKT_APP_URL)}
                      title="Open in Trakt"
                      url={getTraktUrl("episode", item.show.ids.slug, item.episode.season, item.episode.number)}
                    />
                    <Action.OpenInBrowser
                      icon={getFavicon(IMDB_APP_URL)}
                      title="Open in Imdb"
                      url={getIMDbUrl(item.episode.ids.imdb)}
                    />
                  </ActionPanel>
                )}
              />
            }
          />
          <Action
            title="Remove from History"
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => handleShowAction(item, removeEpisodeFromHistoryAction, "Episode removed from history")}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            icon={getFavicon(TRAKT_APP_URL)}
            title="Open in Trakt"
            url={getTraktUrl("episode", item.show.ids.slug, item.episode.season, item.episode.number)}
          />
          <Action.OpenInBrowser
            icon={getFavicon(IMDB_APP_URL)}
            title="Open in Imdb"
            url={getIMDbUrl(item.episode.ids.imdb)}
          />
        </ActionPanel.Section>
      </ActionPanel>
    ),
    [handleShowAction, removeEpisodeFromHistoryAction],
  );

  const searchBarAccessory = (
    <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
      <Grid.Dropdown.Item value="all" title="All" />
      <Grid.Dropdown.Item value="movie" title="Movies" />
      <Grid.Dropdown.Item value="show" title="Shows" />
    </Grid.Dropdown>
  );

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="No history available"
      searchBarPlaceholder="Search history"
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
      items={history}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) =>
        item.mediaType === "movie" ? item.item.movie.title : `${item.item.show.title} - ${item.item.episode.title}`
      }
      subtitle={(item) => {
        const watchedAt = item.item.watched_at ? formatter.format(new Date(item.item.watched_at)) : "";
        if (item.mediaType === "movie") {
          return watchedAt;
        }
        const episodeLabel = `${item.item.episode.season}x${item.item.episode.number.toString().padStart(2, "0")}`;
        return watchedAt ? `${episodeLabel} - ${watchedAt}` : episodeLabel;
      }}
      poster={(item) =>
        getPosterUrl(item.mediaType === "movie" ? item.item.movie.images : item.item.show.images, "poster.png")
      }
      keyFn={(item, index) =>
        item.mediaType === "movie"
          ? `${item.item.movie.ids.trakt}-${index}`
          : `${item.item.show.ids.trakt}-${item.item.episode.ids.trakt}-${index}`
      }
      actions={(item) => (item.mediaType === "movie" ? movieActions(item.item) : showActions(item.item))}
    />
  );
}
