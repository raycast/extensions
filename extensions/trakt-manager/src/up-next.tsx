import { Action, ActionPanel, Alert, Color, Grid, Icon, Keyboard, confirmAlert } from "@raycast/api";
import { getFavicon, getProgressIcon, useCachedPromise } from "@raycast/utils";
import { type PaginationOptions } from "./lib/pagination";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useRef, useState } from "react";
import { GenericDetail } from "./components/generic-detail";
import { GenericGrid } from "./components/generic-grid";
import { CheckinActions } from "./components/checkin-actions";
import { MovieActionPanel } from "./components/media-actions";
import { SeasonGrid } from "./components/season-grid";
import { MarkWatchedOnActions } from "./components/watch-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { APP_MAX_LISTENERS, IMDB_APP_URL, IMDB_SHORTCUT, TRAKT_APP_URL } from "./lib/constants";
import { createEpisodeMarkdown, createEpisodeMetadata } from "./lib/detail-helpers";
import { getBackdropUrl, getIMDbUrl, getTraktUrl } from "./lib/helper";
import {
  checkInEpisode,
  checkInMovie,
  dropMoviePlayback,
  dropShow,
  markEpisodeWatched,
  markPlaybackMovieWatched,
} from "./lib/media-mutations";
import {
  type CombinedMediaItem,
  capPageCountToServedItems,
  fetchCombinedMediaPage,
  fetchMediaPage,
  mediaListCacheOptions,
} from "./lib/media-pagination";
import { TraktPlaybackMovieItem, TraktShowListItem } from "./lib/schema";
import { useCheckinSync } from "./lib/use-checkin-state";

type ContinueWatchingFilterType = "all" | "movie" | "show";

type ContinueWatchingItem = CombinedMediaItem<TraktPlaybackMovieItem, TraktShowListItem>;

const pageLimit = 10;
const combinedPageLimit = pageLimit * 2;

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

// Like Trakt: the subtitle is the film's total length, the time left goes in the tooltip.
const movieSubtitle = ({ movie }: TraktPlaybackMovieItem) =>
  movie.runtime ? formatDuration(movie.runtime) : (movie.year?.toString() ?? "");

const movieTimeLeft = ({ movie, progress }: TraktPlaybackMovieItem) =>
  movie.runtime
    ? `${formatDuration(Math.max(1, Math.round(movie.runtime * (1 - progress / 100))))} left`
    : `${Math.round(100 - progress)}% left`;

const showSubtitle = ({ progress: { next_episode: episode } }: TraktShowListItem) =>
  `S${episode.season}E${episode.number} · ${episode.title}`;

const progressAccessory = (fraction: number, tooltip: string): Grid.Item.Accessory => ({
  icon: getProgressIcon(Math.min(Math.max(fraction, 0), 1), Color.Purple),
  tooltip,
});

const movieAccessory = (entry: TraktPlaybackMovieItem) => progressAccessory(entry.progress / 100, movieTimeLeft(entry));

// `aired` and `completed` are not validated at runtime; draw nothing rather than a wrong circle.
const showAccessory = ({ progress }: TraktShowListItem) => {
  if (!(progress.aired > 0) || typeof progress.completed !== "number") return undefined;

  const left = Math.max(progress.aired - progress.completed, 0);
  return progressAccessory(progress.completed / progress.aired, `${left} ${left === 1 ? "episode" : "episodes"} left`);
};

const toTime = (date: string | undefined) => (date ? new Date(date).getTime() : 0);

const sortByLastActivity = (items: ContinueWatchingItem[]) =>
  [...items].sort((a, b) => {
    const aTime = a.mediaType === "movie" ? toTime(a.item.paused_at) : toTime(a.item.progress.last_watched_at);
    const bTime = b.mediaType === "movie" ? toTime(b.item.paused_at) : toTime(b.item.progress.last_watched_at);
    return bTime - aTime;
  });

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [mediaType, setMediaType] = useState<ContinueWatchingFilterType>("all");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  useCheckinSync();
  const {
    isLoading,
    data: items,
    pagination,
    revalidate,
  } = useCachedPromise(
    (mediaType: ContinueWatchingFilterType) => async (options: PaginationOptions) => {
      await setTimeout(200);

      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);

      const fetchOptions = { signal: abortable.current.signal };
      const requestShowPage = async (page: number) =>
        capPageCountToServedItems(
          await traktClient.shows.getUpNextNitroShows({
            query: { page, limit: pageLimit, intent: "continue" },
            fetchOptions,
          }),
          pageLimit,
        );
      const requestMoviePage = (page: number) =>
        traktClient.movies.getPlaybackMovies({
          query: { page, limit: pageLimit, extended: "full,images" },
          fetchOptions,
        });

      if (mediaType === "show") {
        return fetchMediaPage<"show", TraktShowListItem>("show", () => requestShowPage(options.page + 1));
      }

      if (mediaType === "movie") {
        return fetchMediaPage<"movie", TraktPlaybackMovieItem>("movie", () => requestMoviePage(options.page + 1));
      }

      return fetchCombinedMediaPage<TraktPlaybackMovieItem, TraktShowListItem>({
        page: options.page,
        perPageLimit: pageLimit,
        combinedPageLimit,
        requestMoviePage,
        requestShowPage,
        sort: sortByLastActivity,
      });
    },
    [mediaType],
    mediaListCacheOptions(abortable),
  );

  const onMediaTypeChange = useCallback((newValue: string) => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setMediaType(newValue as ContinueWatchingFilterType);
  }, []);

  const runShowAction = useActionRunner<TraktShowListItem>({ setActionLoading, onSuccess: revalidate });
  const runMovieAction = useActionRunner<TraktPlaybackMovieItem>({ setActionLoading, onSuccess: revalidate });
  // A check-in leaves the item in the list: no revalidate, so an open detail stays open.
  const runShowCheckin = useActionRunner<TraktShowListItem>({ setActionLoading });
  const runMovieCheckin = useActionRunner<TraktPlaybackMovieItem>({ setActionLoading });

  const upNextMarkdown = useCallback((show: TraktShowListItem) => {
    return createEpisodeMarkdown(show.progress.next_episode, show.show);
  }, []);

  const upNextMetadata = useCallback((show: TraktShowListItem) => {
    return createEpisodeMetadata(show.progress.next_episode, show.show);
  }, []);

  const signal = () => abortable.current?.signal;

  const showLabel = (show: TraktShowListItem) =>
    `"${show.show.title}" S${show.progress.next_episode.season}E${show.progress.next_episode.number}`;

  const markShowWatchedAction = (show: TraktShowListItem, watchedAt?: string) =>
    runShowAction(
      show,
      (item) => markEpisodeWatched(traktClient, item.progress.next_episode.ids.trakt, { signal: signal(), watchedAt }),
      `Marked ${showLabel(show)} as watched`,
    );

  const markMovieWatchedAction = (movie: TraktPlaybackMovieItem, watchedAt?: string) =>
    runMovieAction(
      movie,
      (item) => markPlaybackMovieWatched(traktClient, item, { signal: signal(), watchedAt }),
      `Marked "${movie.movie.title}" as watched`,
    );

  const dropShowAction = async (show: TraktShowListItem) => {
    const confirmed = await confirmAlert({
      title: `Drop "${show.show.title}"?`,
      message: "It leaves Continue Watching and your calendar. Restore it from Trakt Web.",
      primaryAction: { title: "Drop Show", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await runShowAction(
      show,
      (item) => dropShow(traktClient, item.show.ids.trakt, { signal: signal() }),
      `Dropped "${show.show.title}"`,
    );
  };

  const dropMovieAction = async (movie: TraktPlaybackMovieItem) => {
    const confirmed = await confirmAlert({
      title: `Drop "${movie.movie.title}"?`,
      message: "It leaves Continue Watching and its saved progress is lost.",
      primaryAction: { title: "Drop Movie", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await runMovieAction(
      movie,
      (item) => dropMoviePlayback(traktClient, item, { signal: signal() }),
      `Dropped "${movie.movie.title}"`,
    );
  };

  const showWatchActions = (show: TraktShowListItem) => (
    <>
      <Action title="Mark as Watched" icon={Icon.Checkmark} onAction={() => markShowWatchedAction(show)} />
      <MarkWatchedOnActions allowReleaseDate onMark={(watchedAt) => markShowWatchedAction(show, watchedAt)} />
      <CheckinActions
        item={show}
        type="episode"
        traktId={show.progress.next_episode.ids.trakt}
        title={showLabel(show)}
        client={traktClient}
        signal={signal}
        run={runShowCheckin}
        checkIn={(item) => checkInEpisode(traktClient, item.progress.next_episode.ids.trakt, { signal: signal() })}
      />
    </>
  );

  const showActions = (item: TraktShowListItem) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          icon={Icon.Eye}
          title="View Details"
          target={
            <GenericDetail
              item={item}
              isLoading={false}
              markdown={upNextMarkdown}
              metadata={upNextMetadata}
              navigationTitle={(show) => show.progress.next_episode.title}
              actions={(show) => (
                <ActionPanel>
                  <ActionPanel.Section>{showWatchActions(show)}</ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      icon={getFavicon(TRAKT_APP_URL)}
                      title="Open Show in Trakt"
                      shortcut={Keyboard.Shortcut.Common.Open}
                      url={getTraktUrl("shows", show.show.ids.slug)}
                    />
                    <Action.OpenInBrowser
                      icon={getFavicon(IMDB_APP_URL)}
                      title="Open Show in Imdb"
                      shortcut={IMDB_SHORTCUT}
                      url={getIMDbUrl(show.show.ids.imdb)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              )}
            />
          }
        />
        {showWatchActions(item)}
        <Action.Push
          icon={Icon.Switch}
          title="Browse Seasons"
          target={<SeasonGrid showId={item.show.ids.trakt} slug={item.show.ids.slug} imdbId={item.show.ids.imdb} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          icon={getFavicon(TRAKT_APP_URL)}
          title="Open in Trakt"
          shortcut={Keyboard.Shortcut.Common.Open}
          url={getTraktUrl("shows", item.show.ids.slug)}
        />
        <Action.OpenInBrowser
          icon={getFavicon(IMDB_APP_URL)}
          title="Open in Imdb"
          shortcut={IMDB_SHORTCUT}
          url={getIMDbUrl(item.show.ids.imdb)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Drop Show"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => dropShowAction(item)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const movieActions = (entry: TraktPlaybackMovieItem) => (
    <MovieActionPanel
      item={entry}
      actions={[]}
      primaryAction={{
        title: "Mark as Watched",
        icon: Icon.Checkmark,
        onAction: (movie) => markMovieWatchedAction(movie),
      }}
      afterPrimary={
        <>
          <MarkWatchedOnActions
            allowReleaseDate={false}
            onMark={(watchedAt) => markMovieWatchedAction(entry, watchedAt)}
          />
          <CheckinActions
            item={entry}
            type="movie"
            traktId={entry.movie.ids.trakt}
            title={entry.movie.title}
            client={traktClient}
            signal={signal}
            run={runMovieCheckin}
            checkIn={(item) => checkInMovie(traktClient, item.movie.ids.trakt, { signal: signal() })}
          />
        </>
      }
      footer={
        <ActionPanel.Section>
          <Action
            title="Drop Movie"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => dropMovieAction(entry)}
          />
        </ActionPanel.Section>
      }
    />
  );

  const searchBarAccessory = (
    <Grid.Dropdown onChange={onMediaTypeChange} tooltip="Media Type">
      <Grid.Dropdown.Item value="all" title="All" />
      <Grid.Dropdown.Item value="show" title="Shows" />
      <Grid.Dropdown.Item value="movie" title="Movies" />
    </Grid.Dropdown>
  );

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="Nothing to continue watching"
      searchBarPlaceholder="Search continue watching"
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
      items={items}
      aspectRatio="16/9"
      columns={3}
      fit={Grid.Fit.Fill}
      title={(entry) => (entry.mediaType === "movie" ? entry.item.movie.title : entry.item.show.title)}
      accessory={(entry) => (entry.mediaType === "movie" ? movieAccessory(entry.item) : showAccessory(entry.item))}
      subtitle={(entry) => (entry.mediaType === "movie" ? movieSubtitle(entry.item) : showSubtitle(entry.item))}
      poster={(entry) =>
        entry.mediaType === "movie"
          ? getBackdropUrl(entry.item.movie.images)
          : getBackdropUrl(entry.item.show.images, entry.item.progress.next_episode.images)
      }
      keyFn={(entry, index) =>
        entry.mediaType === "movie"
          ? `movie-${entry.item.movie.ids.trakt}-${index}`
          : `show-${entry.item.show.ids.trakt}-${index}`
      }
      actions={(entry) => (entry.mediaType === "movie" ? movieActions(entry.item) : showActions(entry.item))}
    />
  );
}
