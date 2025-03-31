import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { Bookmark } from "../types";
import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { useMe } from "./use-me.hook";

export const useMyBookmarks = () => {
  const [sessionToken] = useCachedState("session-token", "");
  const [cached, setCached] = useCachedState<RouterOutputs["bookmark"]["listAll"] | null>("my-bookmarks", null);

  const me = useMe();
  const spaceIds = useMemo(() => {
    return me.data?.associatedSpaces.map((s) => s.id) || [];
  }, [me.data]);

  const r = trpc.bookmark.listAll.useQuery(
    {
      spaceIds,
    },
    {
      enabled: !!sessionToken && !!me.data,
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
  const [sessionToken] = useCachedState("session-token", "");
  const me = useMe();
  const spaceIds = useMemo(() => {
    return Array.isArray(spaceIdOrIds) ? spaceIdOrIds : [spaceIdOrIds];
  }, [spaceIdOrIds]);

  return trpc.bookmark.listAll.useQuery(
    { spaceIds },
    {
      enabled: !!sessionToken && !!me.data,
    },
  );
};
