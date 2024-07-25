import { Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getUpNextShows } from "./api/shows";
import { ShowGrid } from "./components/show-grid";
import { useShowMutations } from "./hooks/useShowMutations";
import { APP_MAX_LISTENERS } from "./lib/constants";

export default function Command() {
  const abortable = useRef<AbortController>();
  const [actionLoading, setActionLoading] = useState(false);
  const { checkInNextEpisodeMutation, error, success } = useShowMutations(abortable);
  const {
    isLoading,
    data: shows,
    pagination,
    revalidate,
  } = useCachedPromise(
    async () => {
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
      return await getUpNextShows(abortable.current?.signal);
    },
    [],
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
    async (show: TraktShowListItem, action: (show: TraktShowListItem) => Promise<void>) => {
      setActionLoading(true);
      try {
        await action(show);
        revalidate();
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
      emptyViewTitle="No up next shows"
      searchBarPlaceholder="Search for shows that are up next"
      pagination={pagination}
      shows={shows as TraktShowList}
      subtitle={(show) =>
        `${show.show.progress?.next_episode?.season}x${show.show.progress?.next_episode?.number.toString().padStart(2, "0")}`
      }
      primaryActionTitle="Check-in Next Episode"
      primaryActionIcon={Icon.Checkmark}
      primaryActionShortcut={Keyboard.Shortcut.Common.Edit}
      primaryAction={(show) => handleAction(show, checkInNextEpisodeMutation)}
    />
  );
}
