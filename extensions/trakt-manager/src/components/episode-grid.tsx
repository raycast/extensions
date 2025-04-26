import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { setMaxListeners } from "node:events";
import { useCallback, useRef, useState } from "react";
import { initTraktClient } from "../lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "../lib/constants";
import { getIMDbUrl, getScreenshotUrl, getTraktUrl } from "../lib/helper";
import { TraktEpisodeListItem } from "../lib/schema";
import { GenericGrid } from "./generic-grid";

export const EpisodeGrid = ({ showId, seasonNumber, slug }: { showId: number; seasonNumber: number; slug: string }) => {
  const abortable = useRef<AbortController>();
  const traktClient = initTraktClient();
  const [actionLoading, setActionLoading] = useState(false);
  const { isLoading, data: episodes } = useCachedPromise(
    async (showId: number, seasonNumber: number) => {
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.getEpisodes({
        query: {
          extended: "full,cloud9",
        },
        params: {
          showid: showId,
          seasonNumber: seasonNumber,
        },
        fetchOptions: {
          signal: abortable.current.signal,
        },
      });

      if (response.status !== 200) return [];
      return response.body;
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

  const addEpisodeToHistory = useCallback(async (episode: TraktEpisodeListItem) => {
    await traktClient.shows.addEpisodeToHistory({
      body: {
        episodes: [
          {
            ids: {
              trakt: episode.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
    });
  }, []);

  const checkInEpisode = useCallback(async (episode: TraktEpisodeListItem) => {
    await traktClient.shows.checkInEpisode({
      body: {
        episodes: [
          {
            ids: {
              trakt: episode.ids.trakt,
            },
            watched_at: new Date().toISOString(),
          },
        ],
      },
    });
  }, []);

  const handleAction = useCallback(
    async (
      episode: TraktEpisodeListItem,
      action: (episode: TraktEpisodeListItem) => Promise<void>,
      message: string,
    ) => {
      setActionLoading(true);
      try {
        await action(episode);
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
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      columns={3}
      searchBarPlaceholder="Search for episodes"
      items={episodes}
      title={(item) => item.title}
      subtitle={(item) => `Episode ${item.number}`}
      poster={(item) => getScreenshotUrl(item.images, "episode.png")}
      keyFn={(item, index) => `${item.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              url={getTraktUrl("episode", slug, seasonNumber, item.number)}
            />
            <Action.OpenInBrowser
              icon={getFavicon(IMDB_APP_URL)}
              title="Open in IMDb"
              url={getIMDbUrl(item.ids.imdb)}
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
};
