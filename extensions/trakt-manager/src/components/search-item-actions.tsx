import { Action, Icon, Keyboard } from "@raycast/api";
import { initTraktClient } from "../lib/client";
import {
  addMovieToWatchlist,
  addShowToWatchlist,
  checkInMovie,
  markMovieWatched,
  markShowWatched,
  removeMovieFromWatchlist,
  removeShowFromWatchlist,
} from "../lib/media-mutations";
import { TraktMovieListItem, TraktShowListItem } from "../lib/schema";
import { useWatchlistState } from "../lib/use-watchlist-ids";
import { CheckinActions } from "./checkin-actions";
import { MarkWatchedOnActions } from "./watch-actions";

type TraktClient = ReturnType<typeof initTraktClient>;

type SearchItemActionsProps<T> = {
  item: T;
  client: TraktClient;
  signal: () => AbortSignal | undefined;
  run: (item: T, action: (item: T) => Promise<void>, message: string) => Promise<void>;
};

/**
 * Actions of a movie result, after Trakt's search card menu (Watchlist, Track…).
 * A component, not a list built by the screen: it reads the shared watchlist state itself, so the
 * Add/Remove label stays right in a detail view opened before the change.
 * While the watchlist is unknown, both Add and Remove are offered.
 */
export const MovieSearchActions = ({
  item: movie,
  client,
  signal,
  run,
}: SearchItemActionsProps<TraktMovieListItem>) => {
  const { isMovieWatchlisted, setListed } = useWatchlistState();
  const listed = isMovieWatchlisted(movie.movie.ids.trakt);
  const traktId = movie.movie.ids.trakt;

  const markWatched = (watchedAt?: string) =>
    run(
      movie,
      (item) => markMovieWatched(client, item.movie.ids.trakt, { signal: signal(), watchedAt }),
      `Marked "${movie.movie.title}" as watched`,
    );

  return (
    <>
      {listed !== true && (
        <Action
          title="Add to Watchlist"
          icon={Icon.Bookmark}
          shortcut={Keyboard.Shortcut.Common.Edit}
          onAction={() =>
            run(
              movie,
              async (item) => {
                await addMovieToWatchlist(client, item, { signal: signal() });
                setListed("movie", traktId, true);
              },
              `Added "${movie.movie.title}" to watchlist`,
            )
          }
        />
      )}
      {listed !== false && (
        <Action
          title="Remove from Watchlist"
          icon={Icon.MinusCircle}
          onAction={() =>
            run(
              movie,
              async (item) => {
                await removeMovieFromWatchlist(client, item, { signal: signal() });
                setListed("movie", traktId, false);
              },
              `Removed "${movie.movie.title}" from watchlist`,
            )
          }
        />
      )}
      <Action
        title="Mark as Watched"
        icon={Icon.Checkmark}
        shortcut={Keyboard.Shortcut.Common.Duplicate}
        onAction={() => markWatched()}
      />
      <MarkWatchedOnActions allowReleaseDate={false} onMark={markWatched} />
      <CheckinActions
        item={movie}
        traktId={traktId}
        title={movie.movie.title}
        client={client}
        signal={signal}
        run={run}
        checkIn={(item) => checkInMovie(client, item.movie.ids.trakt, { signal: signal() })}
      />
    </>
  );
};

/**
 * Actions of a show result. "Track…" on a show card marks the whole show, as in Trakt Web, so the
 * label says so. Trakt documents `released` for episodes only, and a check-in needs one episode,
 * so neither is offered here.
 */
export const ShowSearchActions = ({ item: show, client, signal, run }: SearchItemActionsProps<TraktShowListItem>) => {
  const { isShowWatchlisted, setListed } = useWatchlistState();
  const listed = isShowWatchlisted(show.show.ids.trakt);
  const traktId = show.show.ids.trakt;

  const markWatched = (watchedAt?: string) =>
    run(
      show,
      (item) => markShowWatched(client, item.show.ids.trakt, { signal: signal(), watchedAt }),
      `Marked "${show.show.title}" as watched`,
    );

  return (
    <>
      {listed !== true && (
        <Action
          title="Add to Watchlist"
          icon={Icon.Bookmark}
          shortcut={Keyboard.Shortcut.Common.Edit}
          onAction={() =>
            run(
              show,
              async (item) => {
                await addShowToWatchlist(client, item, { signal: signal() });
                setListed("show", traktId, true);
              },
              `Added "${show.show.title}" to watchlist`,
            )
          }
        />
      )}
      {listed !== false && (
        <Action
          title="Remove from Watchlist"
          icon={Icon.MinusCircle}
          onAction={() =>
            run(
              show,
              async (item) => {
                await removeShowFromWatchlist(client, item, { signal: signal() });
                setListed("show", traktId, false);
              },
              `Removed "${show.show.title}" from watchlist`,
            )
          }
        />
      )}
      <Action
        title="Mark Whole Show as Watched"
        icon={Icon.Checkmark}
        shortcut={Keyboard.Shortcut.Common.Duplicate}
        onAction={() => markWatched()}
      />
      <MarkWatchedOnActions title="Mark Whole Show as Watched on…" allowReleaseDate={false} onMark={markWatched} />
    </>
  );
};
