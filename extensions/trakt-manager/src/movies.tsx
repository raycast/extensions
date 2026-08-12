import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { MovieActionPanel } from "./components/media-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { getPosterUrl } from "./lib/helper";
import { addMovieToHistory, addMovieToWatchlist } from "./lib/media-mutations";
import { TraktMovieListItem } from "./lib/schema";
import { abortSearch, createSearchFetcher } from "./lib/search";

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: movies,
    pagination,
  } = useCachedPromise(
    createSearchFetcher({
      abortable,
      search: traktClient.movies.searchMovies,
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

  const addMovieToWatchlistAction = useCallback(
    async (movie: TraktMovieListItem) => {
      await addMovieToWatchlist(traktClient, movie, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const addMovieToHistoryAction = useCallback(
    async (movie: TraktMovieListItem) => {
      await addMovieToHistory(traktClient, movie, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const handleSearchTextChange = useCallback(abortSearch(abortable, setSearchText), []);

  const runMovieAction = useActionRunner<TraktMovieListItem>({ setActionLoading });

  return (
    <GenericGrid
      isLoading={isLoading || actionLoading}
      emptyViewTitle="Search for movies"
      searchBarPlaceholder="Search for movies"
      onSearchTextChange={handleSearchTextChange}
      throttle={true}
      pagination={pagination}
      items={movies}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      title={(item) => item.movie.title}
      poster={(item) => getPosterUrl(item.movie.images, "poster.png")}
      keyFn={(item, index) => `${item.movie.ids.trakt}-${index}`}
      actions={(item) => (
        <MovieActionPanel
          item={item}
          actions={[
            {
              title: "Add to Watchlist",
              icon: Icon.Bookmark,
              shortcut: Keyboard.Shortcut.Common.Edit,
              onAction: (movie) => runMovieAction(movie, addMovieToWatchlistAction, "Movie added to watchlist"),
            },
            {
              title: "Add to History",
              icon: Icon.Clock,
              shortcut: Keyboard.Shortcut.Common.Duplicate,
              onAction: (movie) => runMovieAction(movie, addMovieToHistoryAction, "Movie added to history"),
            },
          ]}
        />
      )}
    />
  );
}
