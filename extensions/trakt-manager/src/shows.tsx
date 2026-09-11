import { Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { ShowActionPanel } from "./components/media-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { getPosterUrl } from "./lib/helper";
import { addShowToHistory, addShowToWatchlist, checkInFirstEpisodeToHistory } from "./lib/media-mutations";
import { TraktShowListItem } from "./lib/schema";
import { abortSearch, createSearchFetcher } from "./lib/search";

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  const {
    isLoading,
    data: shows,
    pagination,
  } = useCachedPromise(
    createSearchFetcher({
      abortable,
      delay: 200,
      search: traktClient.shows.searchShows,
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

  const addShowToWatchlistAction = useCallback(
    async (show: TraktShowListItem) => {
      await addShowToWatchlist(traktClient, show, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const addShowToHistoryAction = useCallback(
    async (show: TraktShowListItem) => {
      await addShowToHistory(traktClient, show, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const checkInFirstEpisodeToHistoryAction = useCallback(
    async (show: TraktShowListItem) => {
      await checkInFirstEpisodeToHistory(traktClient, show, { signal: abortable.current?.signal });
    },
    [traktClient],
  );

  const handleSearchTextChange = useCallback(abortSearch(abortable, setSearchText), []);

  const runShowAction = useActionRunner<TraktShowListItem>({ setActionLoading });

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
        <ShowActionPanel
          item={item}
          onCheckInFirstEpisode={(show) =>
            runShowAction(show, checkInFirstEpisodeToHistoryAction, "First episode checked-in")
          }
          actions={[
            {
              title: "Add to Watchlist",
              icon: Icon.Bookmark,
              shortcut: Keyboard.Shortcut.Common.Edit,
              onAction: (show) => runShowAction(show, addShowToWatchlistAction, "Show added to watchlist"),
            },
            {
              title: "Add to History",
              icon: Icon.Clock,
              shortcut: Keyboard.Shortcut.Common.Duplicate,
              onAction: (show) => runShowAction(show, addShowToHistoryAction, "Show added to history"),
            },
          ]}
        />
      )}
    />
  );
}
