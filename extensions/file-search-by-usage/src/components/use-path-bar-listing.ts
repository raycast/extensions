import { useEffect, useMemo, useState } from "react";
import path from "node:path";
import { DirectorySnapshot } from "../lib/directory-listing";
import {
  CACHED_METADATA_BUDGET_MS,
  validateRecentEntries,
} from "../lib/recent-validation";
import { Entry } from "../lib/types";
import { useDirectoryListing } from "./use-directory-listing";

/** What the path bar publishes: one list, and whether it is still settling. */
export type PathBarListing = {
  rows: Entry[];
  omitted: number;
  error?: string;
  pending: boolean;
};

/** Children of the typed directory, plus the directory itself if it exists. */
export function usePathBarListing(
  pathQuery: { dir: string; prefix: string } | undefined,
  showHidden: boolean,
  reloadKey: number,
  queryController: AbortController,
  searchActive: boolean,
): PathBarListing {
  const typedDirectory = useDirectoryListing(
    pathQuery?.dir,
    showHidden,
    reloadKey,
    queryController.signal,
    searchActive,
  );
  const exactPath = pathQuery
    ? pathQuery.prefix === ""
      ? pathQuery.dir
      : path.join(pathQuery.dir, pathQuery.prefix)
    : undefined;
  const [exactEntry, setExactEntry] = useState<{
    path: string;
    listing: DirectorySnapshot;
    entry?: Entry;
    reloadKey: number;
  }>();
  useEffect(() => {
    if (exactPath === undefined) return;
    const controller = new AbortController();
    const stop = () => controller.abort();
    queryController.signal.addEventListener("abort", stop, { once: true });
    if (queryController.signal.aborted) stop();
    const listed = typedDirectory.entries.find(
      (entry) => entry.path === exactPath,
    );
    const read = listed
      ? Promise.resolve(listed)
      : validateRecentEntries([{ path: exactPath }], {
          limit: 1,
          budgetMs: CACHED_METADATA_BUDGET_MS,
          signal: controller.signal,
        }).then((result) => result.entries[0]);
    void read.then((entry) => {
      if (!controller.signal.aborted)
        setExactEntry({
          path: exactPath,
          listing: typedDirectory,
          entry,
          reloadKey,
        });
    });
    return () => {
      queryController.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [exactPath, typedDirectory, reloadKey, queryController]);
  const exactReady =
    exactPath === undefined ||
    (exactEntry?.path === exactPath &&
      exactEntry.listing === typedDirectory &&
      exactEntry.reloadKey === reloadKey);
  return useMemo(
    () => ({
      rows: pathQuery
        ? [
            ...(exactReady && exactEntry?.entry ? [exactEntry.entry] : []),
            ...typedDirectory.entries,
          ]
        : [],
      omitted: typedDirectory.truncated,
      error: typedDirectory.error,
      pending: typedDirectory.pending || !exactReady,
    }),
    [pathQuery, exactReady, exactEntry, typedDirectory],
  );
}
