import { SortBy, SortOrder, UseWatchesResult, WatchWithID, WatchesResponse } from "@/types";
import { useApi } from "@/hooks/use-api";

export const useWatches = ({ sortBy, sortOrder }: { sortBy: SortBy; sortOrder: SortOrder }) => {
  const { data: watchesResponse, ...rest } = useApi<WatchesResponse>("watch");
  const watches: UseWatchesResult = Object.entries(watchesResponse ?? {})
    .map(([id, watch]) => {
      // We're fixing an issue here where it doesn't make sense it is not seen as viewed when it has not changed yet
      if (!watch.viewed && !watch.last_changed) {
        watch.viewed = true;
      }
      return { ...watch, id } as WatchWithID;
    })
    .reduce(
      (acc: UseWatchesResult, watch) => {
        if (watch.viewed) {
          acc.seen.push(watch);
        } else {
          acc.unseen.push(watch);
        }
        return acc;
      },
      { unseen: [], seen: [] },
    );

  if (sortBy === "last_checked") {
    watches.unseen.sort((a, b) =>
      sortOrder === "asc" ? a.last_checked - b.last_checked : b.last_checked - a.last_checked,
    );
    watches.seen.sort((a, b) =>
      sortOrder === "asc" ? a.last_checked - b.last_checked : b.last_checked - a.last_checked,
    );
  } else if (sortBy === "last_changed") {
    watches.unseen.sort((a, b) =>
      sortOrder === "asc" ? a.last_changed - b.last_changed : b.last_changed - a.last_changed,
    );
    watches.seen.sort((a, b) =>
      sortOrder === "asc" ? a.last_changed - b.last_changed : b.last_changed - a.last_changed,
    );
  }
  return { data: watches, ...rest };
};
