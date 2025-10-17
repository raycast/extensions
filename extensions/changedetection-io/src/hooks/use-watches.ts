import { SortBy, UseWatchesResult, WatchWithID, WatchesResponse } from "@/types";
import { useApi } from "@/hooks/use-api";

const sortAsc = (a: number, b: number) => a - b;
const sortDesc = (a: number, b: number) => b - a;

export const useWatches = ({ sortBy }: { sortBy: SortBy }) => {
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

  if (sortBy === "checked_asc") {
    watches.unseen.sort((a, b) => sortAsc(a.last_checked, b.last_checked));
    watches.seen.sort((a, b) => sortAsc(a.last_checked, b.last_checked));
  } else if (sortBy === "checked_des") {
    watches.unseen.sort((a, b) => sortDesc(a.last_checked, b.last_checked));
    watches.seen.sort((a, b) => sortDesc(a.last_checked, b.last_checked));
  } else if (sortBy === "changed_asc") {
    watches.unseen.sort((a, b) => sortAsc(a.last_changed, b.last_changed));
    watches.seen.sort((a, b) => sortAsc(a.last_changed, b.last_changed));
  } else if (sortBy === "changed_des") {
    watches.unseen.sort((a, b) => sortDesc(a.last_changed, b.last_changed));
    watches.seen.sort((a, b) => sortDesc(a.last_changed, b.last_changed));
  }
  return { data: watches, ...rest };
};
