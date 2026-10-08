import { Grid, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { GenericGrid } from "./components/generic-grid";
import { ShowActionPanel } from "./components/media-actions";
import { ShowSearchActions } from "./components/search-item-actions";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { getPosterUrl } from "./lib/helper";
import { markFirstEpisodeWatched } from "./lib/media-mutations";
import { TraktShowListItem } from "./lib/schema";
import { useRatingsSync } from "./lib/use-ratings";
import { useWatchedSync } from "./lib/use-watched";
import { useWatchlistSync } from "./lib/use-watchlist-ids";
import { abortSearch, createSearchFetcher } from "./lib/search";

export default function Command() {
  const abortable = useRef<AbortController | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();
  useWatchlistSync();
  useRatingsSync();
  useWatchedSync();
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

  const markFirstEpisodeWatchedAction = useCallback(
    async (show: TraktShowListItem) => {
      await markFirstEpisodeWatched(traktClient, show.show.ids.trakt, { signal: abortable.current?.signal });
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
          onMarkFirstEpisodeWatched={(show) =>
            runShowAction(show, markFirstEpisodeWatchedAction, "First episode marked as watched")
          }
          actions={[]}
          actionItems={
            <ShowSearchActions
              item={item}
              client={traktClient}
              signal={() => abortable.current?.signal}
              run={runShowAction}
            />
          }
        />
      )}
    />
  );
}
