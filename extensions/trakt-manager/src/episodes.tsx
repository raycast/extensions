import { Action, ActionPanel, Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { TraktShowHistoryListItem, withPagination } from "./lib/schema";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: episodes,
    pagination,
  } = useCachedPromise(
    (searchText: string) => async (options: PaginationOptions) => {
      if (!searchText) return { data: [], hasMore: false };
      await setTimeout(100);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.searchEpisodes({
        query: {
          query: searchText,
          page: options.page + 1,
          limit: 10,
          fields: "title",
          extended: "full,cloud9",
        },
        fetchOptions: {
          signal: abortable.current.signal,
        },
      });

      if (response.status !== 200) return { data: [], hasMore: false };
      const paginatedResponse = withPagination(response);

      return {
        data: paginatedResponse.data,
        hasMore:
          paginatedResponse.pagination["x-pagination-page"] < paginatedResponse.pagination["x-pagination-page-count"],
      };
    },
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
              trakt: episode.show.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
    });
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string): void => {
      abortable.current?.abort();
      abortable.current = new AbortController();
      setSearchText(text);
    },
    [abortable],
  );

  const handleAction = useCallback(
    async (
      movie: TraktShowHistoryListItem,
      action: (movie: TraktShowHistoryListItem) => Promise<void>,
      message: string,
    ) => {
      setActionLoading(true);
      try {
        await action(movie);
        showToast({
          title: message,
          style: Toast.Style.Success,
        });
      } catch (e) {
        showToast({
          title: (e as Error).message,
          style: Toast.Style.Failure,
        });
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

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
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              url={getTraktUrl("episode", item.show.ids.slug, item.episode.season, item.episode.number)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in IMDb"
              url={getIMDbUrl(item.episode.ids.imdb)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Check-in"
              icon={Icon.Checkmark}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => handleAction(item, checkInEpisode, "Episode checked-in")}
            />
            <Action
              title="Add to History"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={() => handleAction(item, addEpisodeToHistory, "Episode added to history")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
