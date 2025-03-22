import { Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { setMaxListeners } from "node:events";
import { setTimeout } from "node:timers/promises";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchShows } from "./api/shows";
import { ShowGrid } from "./components/show-grid";
import { useShowMutations } from "./hooks/useShowMutations";
import { APP_MAX_LISTENERS } from "./lib/constants";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [searchText, setSearchText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const { addShowToWatchlistMutation, addShowToHistoryMutation, checkInFirstEpisodeMutation, error, success } =
    useShowMutations(abortable);
  const {
    isLoading,
    data: shows,
    pagination,
  } = useCachedPromise(
    (searchText: string) => async (options: PaginationOptions) => {
      if (!searchText) {
        return { data: [], hasMore: false };
      }
      await setTimeout(200);
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
      const pagedShows = await searchShows(searchText, options.page + 1, abortable.current?.signal);
      return { data: pagedShows, hasMore: options.page < pagedShows.total_pages };
    },
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

  const handleSearchTextChange = useCallback((text: string): void => {
    abortable.current?.abort();
    abortable.current = new AbortController();
    setSearchText(text);
  }, []);

  const handleAction = useCallback(
    async (show: TraktShowListItem, action: (show: TraktShowListItem) => Promise<void>) => {
      setActionLoading(true);
      try {
        await action(show);
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (error) {
      showToast({
        title: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      showToast({
        title: success,
        style: Toast.Style.Success,
      });
    }
  }, [success]);

  return (
    <ShowGrid
      isLoading={isLoading || actionLoading}
      searchBarPlaceholder="Search for shows"
      onSearchTextChange={handleSearchTextChange}
      throttle={true}
      pagination={pagination}
      emptyViewTitle="Search for shows"
      shows={shows as TraktShowList}
      subtitle={(show) => show.show.year?.toString() || ""}
      primaryActionTitle="Add to Watchlist"
      primaryActionIcon={Icon.Bookmark}
      primaryActionShortcut={Keyboard.Shortcut.Common.Edit}
      primaryAction={(show) => handleAction(show, addShowToWatchlistMutation)}
      secondaryActionTitle="Add to History"
      secondaryActionIcon={Icon.Clock}
      secondaryActionShortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
      secondaryAction={(show) => handleAction(show, addShowToHistoryMutation)}
      tertiaryActionTitle="Check-in first episode"
      tertiaryActionIcon={Icon.Checkmark}
      tertiaryActionShortcut={Keyboard.Shortcut.Common.Duplicate}
      tertiaryAction={(show) => handleAction(show, checkInFirstEpisodeMutation)}
    />
  );
}
