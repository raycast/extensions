import { Action, ActionPanel, Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { setMaxListeners } from "node:events";
import { useCallback, useRef, useState } from "react";
import { initTraktClient } from "../lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, TRAKT_APP_URL } from "../lib/constants";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { TraktSeasonListItem } from "../lib/schema";
import { EpisodeGrid } from "./episode-grid";
import { GenericGrid } from "./generic-grid";

export const SeasonGrid = ({ showId, slug, imdbId }: { showId: number; slug?: string; imdbId: string }) => {
  const abortable = useRef<AbortController>();
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const { isLoading, data: seasons } = useCachedPromise(
    async (showId: number) => {
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const response = await traktClient.shows.getSeasons({
        query: {
          extended: "full,cloud9",
        },
        params: {
          showid: showId,
        },
        fetchOptions: {
          signal: abortable.current.signal,
        },
      });

      if (response.status !== 200) return [];
      return response.body;
    },
    [showId],
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

  const handleAction = useCallback(
    async (show: TraktSeasonListItem, action: (show: TraktSeasonListItem) => Promise<void>, message: string) => {
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

  const addSeasonToHistory = useCallback(async (season: TraktSeasonListItem) => {
    await traktClient.shows.addSeasonToHistory({
      body: {
        seasons: [
          {
            ids: {
              trakt: season.ids.trakt,
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

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search for seasons"
      items={seasons}
      title={(item) => `Season ${item.number}`}
      subtitle={(item) => `${item.episode_count} episodes`}
      poster={(item) => getPosterUrl(item.images, "poster.png")}
      keyFn={(item, index) => `${item.ids.trakt}-${index}`}
      actions={(item) => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Switch}
              title="Browse Episodes"
              target={<EpisodeGrid showId={showId} seasonNumber={item.number} slug={slug} />}
            />
            <Action
              title="Add to History"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={() => handleAction(item, addSeasonToHistory, "Season added to history")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={getFavicon(TRAKT_APP_URL)}
              title="Open in Trakt"
              url={getTraktUrl("season", slug, item.number)}
            />
            <Action.OpenInBrowser icon={getFavicon(IMDB_APP_URL)} title="Open in Imdb" url={getIMDbUrl(imdbId)} />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
};
