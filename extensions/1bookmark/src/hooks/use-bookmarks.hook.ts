import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { Bookmark } from "../types";
import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { CACHED_KEY_SESSION_TOKEN, CACHED_KEY_MY_BOOKMARKS } from "@/utils/constants.util";
import { useEnabledSpaces } from "./use-enabled-spaces.hook";

export const useMyBookmarks = () => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const [cached, setCached] = useCachedState<RouterOutputs["bookmark"]["listAll"] | null>(
    CACHED_KEY_MY_BOOKMARKS,
    null,
  );

  const { enabledSpaceIds } = useEnabledSpaces();

  const r = trpc.bookmark.listAll.useQuery(
    {
      spaceIds: enabledSpaceIds || [],
    },
    {
      enabled: !!sessionToken && !!enabledSpaceIds,
      initialData: () => {
        if (!cached) {
          return undefined;
        }

        // TODO: Check compatibility and return.
        // Or, change key for each schema version.
        const initialData: Bookmark[] = cached;
        if (!initialData[0]?.tags) {
          // Remove cache for versions before 0.3.0.
          setCached(null);
          return undefined;
        }
        console.info("Cache hit useBookmarks");
        return initialData;
      },
    },
  );

  useEffect(() => {
    if (!r.data) return;

    setCached(r.data);
  }, [r.data, setCached]);

  return r;
};

export const useBookmarks = (spaceIdOrIds: string | string[]) => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const spaceIds = useMemo(() => {
    return Array.isArray(spaceIdOrIds) ? spaceIdOrIds : [spaceIdOrIds];
  }, [spaceIdOrIds]);

  return trpc.bookmark.listAll.useQuery(
    { spaceIds },
    {
      enabled: !!sessionToken,
    },
  );
};
