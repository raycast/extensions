import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { SeasonGrid } from "./components/season-grid";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "./lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { TraktShowListItem, withPagination } from "./lib/schema";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: shows,
    pagination,
  } = useCachedPromise(
    (searchText: string) => async (options: PaginationOptions) => {
      if (!searchText) return { data: [], hasMore: false };
      await setTimeout(200);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.searchShows({
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

  const addShowToWatchlist = useCallback(async (show: TraktShowListItem) => {
    await traktClient.shows.addShowToWatchlist({
      body: {
        shows: [
          {
            ids: {
              trakt: show.show.ids.trakt,
            },
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const addShowToHistory = useCallback(async (show: TraktShowListItem) => {
    await traktClient.shows.addShowToHistory({
      body: {
        shows: [
          {
            ids: {
              trakt: show.show.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const checkInFirstEpisodeToHistory = useCallback(async (show: TraktShowListItem) => {
    const response = await traktClient.shows.getEpisode({
      params: {
        showid: show.show.ids.trakt,
        seasonNumber: 1,
        episodeNumber: 1,
      },
      query: {
        extended: "full",
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });

    if (response.status !== 200) throw new Error("Failed to get first episode");
    const firstEpisode = response.body;

    await traktClient.shows.checkInEpisode({
      body: {
        episodes: [
          {
            ids: {
              trakt: firstEpisode.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
      fetchOptions: {
        signal: abortable.current?.signal,
      },
    });
  }, []);

  const handleSearchTextChange = useCallback((text: string): void => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setSearchText(text);
  }, []);

  const handleAction = useCallback(
    async (show: TraktShowListItem, action: (show: TraktShowListItem) => Promise<void>, message: string) => {
      setActionLoading(true);
      try {
        await action(show);
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
      emptyViewTitle="Search for shows"
      searchBarPlaceholder="Search for shows"
      onSearchTextChange={handleSearchTextChange}
      throttle={true}
      pagination={pagination}
      items={shows}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => item.show.title}
      subtitle={(item) => item.show.year?.toString() || ""}
      poster={(item) => getPosterUrl(item.show.images, "poster.png")}
      keyFn={(item, index) => `${item.show.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Switch}
              title="Browse Seasons"
              target={<SeasonGrid showId={item.show.ids.trakt} slug={item.show.ids.slug} imdbId={item.show.ids.imdb} />}
            />
            <Action
              title="Check-in"
              icon={Icon.Checkmark}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => handleAction(item, checkInFirstEpisodeToHistory, "First episode checked-in")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              url={getTraktUrl("shows", item.show.ids.slug)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in Imdb"
              url={getIMDbUrl(item.show.ids.imdb)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Add to Watchlist"
              icon={Icon.Bookmark}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => handleAction(item, addShowToWatchlist, "Show added to watchlist")}
            />
            <Action
              title="Add to History"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={() => handleAction(item, addShowToHistory, "Show added to history")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
