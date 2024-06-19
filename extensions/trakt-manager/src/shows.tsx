import { Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "./components/auth";
import { ShowGrid } from "./components/show-grid";
import { addShowToHistory, addShowToWatchlist, searchShows } from "./services/shows";
import { getTMDBShowDetails } from "./services/tmdb";

function SearchCommand() {
  const { isAuthenticated } = useAuth();
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string | undefined>();
  const [shows, setShows] = useState<TraktShowList | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        return;
      }

      if (abortable.current) {
        abortable.current.abort();
      }
      abortable.current = new AbortController();
      setMaxListeners(20, abortable.current?.signal);
      if (!searchText) {
        setShows(undefined);
      } else {
        setIsLoading(true);
        try {
          const shows = await searchShows(searchText, page, abortable.current.signal);
          setShows(shows);
          setPage(shows.page);
          setTotalPages(shows.total_pages);

          const showsWithImages = (await Promise.all(
            shows.map(async (movie) => {
              movie.show.details = await getTMDBShowDetails(movie.show.ids.tmdb, abortable.current?.signal);
              return movie;
            }),
          )) as TraktShowList;

          setShows(showsWithImages);
        } catch (e) {
          if (!(e instanceof AbortError)) {
            showToast({
              title: "Error searching shows",
              style: Toast.Style.Failure,
            });
          }
        }
        setIsLoading(false);
        return () => {
          if (abortable.current) {
            abortable.current.abort();
          }
        };
      }
    })();
  }, [isAuthenticated, searchText, page]);

  const onAddShowToWatchlist = async (showId: number) => {
    setIsLoading(true);
    try {
      await addShowToWatchlist(showId, abortable.current?.signal);
      showToast({
        title: "Show added to watchlist",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error adding show to watchlist",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
  };

  const onAddShowToHistory = async (showId: number) => {
    setIsLoading(true);
    try {
      await addShowToHistory(showId, abortable.current?.signal);
      showToast({
        title: "Show added to history",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error adding show to history",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
  };

  const onSearchTextChange = (text: string): void => {
    setSearchText(text);
    setPage(1);
    setTotalPages(1);
  };

  return (
    <Grid
      isLoading={isLoading}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search for shows"
      onSearchTextChange={onSearchTextChange}
      throttle={true}
    >
      <Grid.EmptyView title="Search for shows" />
      <ShowGrid
        shows={shows}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        watchlistActionTitle="Add to Watchlist"
        watchlistAction={onAddShowToWatchlist}
        watchlistActionIcon={Icon.Bookmark}
        watchlistActionShortcut={Keyboard.Shortcut.Common.Edit}
        historyActionTitle="Add to History"
        historyActionIcon={Icon.Clock}
        historyActionShortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        historyAction={onAddShowToHistory}
      />
    </Grid>
  );
}

export default function Command() {
  return (
    <AuthProvider>
      <SearchCommand />
    </AuthProvider>
  );
}
