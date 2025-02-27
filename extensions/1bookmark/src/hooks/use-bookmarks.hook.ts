import { Cache } from "@raycast/api";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { Bookmark } from "../types";
import { useEffect } from "react";

const cache = new Cache();

export const useBookmarks = (p: { sessionToken: string; spaceIds: string[]; me?: RouterOutputs["user"]["me"] }) => {
  const { sessionToken, spaceIds, me } = p;
  const r = trpc.bookmark.listAll.useQuery(
    {
      spaceIds,
    },
    {
      enabled: !!sessionToken && !!me,
      initialData: () => {
        const cachedBookmarks = cache.get("bookmarks");
        if (!cachedBookmarks) {
          return undefined;
        }

        // TODO: Check compatibility and return.
        // Or, change key for each schema version.
        const initialData: Bookmark[] = JSON.parse(cachedBookmarks);
        if (!initialData[0]?.tags) {
          // Remove cache for versions before 0.3.0.
          cache.remove("bookmarks");
          return undefined;
        }
        console.info("Cache hit useBookmarks");
        return initialData;
      },
    },
  );

  useEffect(() => {
    if (!r.data) return;

    cache.set("bookmarks", JSON.stringify(r.data));
  }, [r.data]);

  return r;
};
