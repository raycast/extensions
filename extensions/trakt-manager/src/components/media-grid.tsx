import { Grid } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { useActionRunner } from "../lib/action-runner";
import { initTraktClient } from "../lib/client";
import { getPosterUrl } from "../lib/helper";
import { markFirstEpisodeWatched } from "../lib/media-mutations";
import { TraktMovieBaseItem, TraktMovieListItem, TraktShowBaseItem, TraktShowListItem } from "../lib/schema";
import { useWatchedState } from "../lib/use-watched";
import { GenericGrid } from "./generic-grid";
import { MovieActionPanel, ShowActionPanel } from "./media-actions";
import { MovieSearchActions, ShowSearchActions } from "./search-item-actions";

/** A movie or a show to show with the search actions, plus an optional line under its title. */
export type MediaEntry =
  | { mediaType: "movie"; movie: TraktMovieBaseItem; subtitle?: string }
  | { mediaType: "show"; show: TraktShowBaseItem; subtitle?: string };

/** Search results carry a plain movie, as these lists do. */
const asMovieItem = (movie: TraktMovieBaseItem): TraktMovieListItem => ({ type: "movie", score: 0, movie });

/** Search results carry no watched progress either; the search actions never read it. */
const asShowItem = (show: TraktShowBaseItem) => ({ type: "show", score: 0, show }) as TraktShowListItem;

const entryKey = (entry: MediaEntry, index: number) =>
  `${entry.mediaType}-${entry.mediaType === "movie" ? entry.movie.ids.trakt : entry.show.ids.trakt}-${index}`;

/**
 * A grid of movies and shows with the same actions as search (watchlist, mark as watched, rate, remove from
 * history, browse seasons). The caller fetches; the watchlist, rating and history states are shared, so they
 * must have been read by the command that opened this grid.
 */
export const MediaGrid = ({
  entries,
  isLoading,
  pagination,
  emptyViewTitle,
  searchBarPlaceholder,
  searchBarAccessory,
}: {
  entries: MediaEntry[] | undefined;
  isLoading: boolean;
  pagination?: Grid.Props["pagination"];
  emptyViewTitle: string;
  searchBarPlaceholder: string;
  searchBarAccessory?: Grid.Props["searchBarAccessory"];
}) => {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const { setWatched } = useWatchedState();
  const runMovieAction = useActionRunner<TraktMovieListItem>({ setActionLoading });
  const runShowAction = useActionRunner<TraktShowListItem>({ setActionLoading });
  const signal = () => abortable.current?.signal;

  const markFirstEpisode = useCallback(async (show: TraktShowListItem) => {
    await markFirstEpisodeWatched(traktClient, show.show.ids.trakt, { signal: signal() });
    const showId = show.show.ids.trakt;
    setWatched({ type: "show", traktId: showId }, true);
    setWatched({ type: "episode", showId, season: 1, number: 1 }, true);
  }, []);

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle={emptyViewTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
      items={entries}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(entry) => (entry.mediaType === "movie" ? entry.movie.title : entry.show.title)}
      subtitle={(entry) =>
        entry.subtitle ?? (entry.mediaType === "movie" ? entry.movie.year : entry.show.year)?.toString() ?? ""
      }
      poster={(entry) =>
        getPosterUrl(entry.mediaType === "movie" ? entry.movie.images : entry.show.images, "poster.png")
      }
      keyFn={entryKey}
      actions={(entry) =>
        entry.mediaType === "movie" ? (
          <MovieActionPanel
            item={asMovieItem(entry.movie)}
            actions={[]}
            actionItems={(movie) => (
              <MovieSearchActions item={movie} client={traktClient} signal={signal} run={runMovieAction} />
            )}
          />
        ) : (
          <ShowActionPanel
            item={asShowItem(entry.show)}
            onMarkFirstEpisodeWatched={(show) =>
              runShowAction(show, markFirstEpisode, "First episode marked as watched")
            }
            actions={[]}
            actionItems={
              <ShowSearchActions
                item={asShowItem(entry.show)}
                client={traktClient}
                signal={signal}
                run={runShowAction}
              />
            }
          />
        )
      }
    />
  );
};
