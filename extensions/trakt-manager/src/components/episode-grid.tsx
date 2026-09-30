import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { setMaxListeners } from "node:events";
import { useCallback, useRef, useState } from "react";
import { useActionRunner } from "../lib/action-runner";
import { initTraktClient } from "../lib/client";
import { APP_MAX_LISTENERS } from "../lib/constants";
import { createEpisodeMarkdown, createEpisodeMetadata } from "../lib/detail-helpers";
import { getScreenshotUrl } from "../lib/helper";
import { TraktEpisodeListItem, TraktShowBaseItem } from "../lib/schema";
import { EpisodeActionPanel, episodeTraktUrl } from "./episode-actions";
import { GenericGrid } from "./generic-grid";

export const EpisodeGrid = ({
  showId,
  seasonNumber,
  slug,
}: {
  showId: number;
  seasonNumber: number;
  slug?: string;
}) => {
  const abortable = useRef<AbortController | undefined>(undefined);
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

  const handleAction = useActionRunner<TraktEpisodeListItem>({ setActionLoading });

  const episodeMarkdown = useCallback(
    (episode: TraktEpisodeListItem) =>
      createEpisodeMarkdown(episode, { ids: { slug: slug ?? "" }, title: slug ?? "Unknown Show" } as TraktShowBaseItem),
    [slug],
  );

  const episodeMetadata = useCallback(
    (episode: TraktEpisodeListItem) =>
      createEpisodeMetadata(episode, { ids: { slug: slug ?? "" }, title: slug ?? "Unknown Show" } as TraktShowBaseItem),
    [slug],
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
        <EpisodeActionPanel
          item={item}
          markdown={episodeMarkdown}
          metadata={episodeMetadata}
          navigationTitle={(episode) => `${episode.title} • S${episode.season}E${episode.number}`}
          traktUrl={(episode) => episodeTraktUrl(slug, episode.season, episode.number)}
          imdbId={(episode) => episode.ids.imdb}
          actions={[
            {
              title: "Check-In",
              icon: Icon.Checkmark,
              shortcut: Keyboard.Shortcut.Common.Edit,
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
};
