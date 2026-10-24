import { trpc } from "@/utils/trpc.util";
import { Bookmark, CachedMyBookmarks } from "../types";
import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import {
  CACHED_KEY_SESSION_TOKEN,
  CACHED_KEY_MY_BOOKMARKS,
  MY_BOOKMARKS_CACHE_SCHEMA_VERSION,
} from "@/utils/constants.util";
import { useEnabledSpaces } from "./use-enabled-spaces.hook";

const isCompatibleCache = (cached: unknown): cached is CachedMyBookmarks => {
  if (typeof cached !== "object" || cached === null || Array.isArray(cached)) {
    return false;
  }

  const { schemaVersion, bookmarks } = cached as Partial<CachedMyBookmarks>;
  return schemaVersion === MY_BOOKMARKS_CACHE_SCHEMA_VERSION && Array.isArray(bookmarks);
};

// Versions up to 0.13.x stored the bare bookmark array without a schema version.
// The listAll response shape has not changed since then, so that cache is migrated into
// the current envelope instead of being discarded. Dropping it would leave a user who
// upgrades while offline with no cached bookmarks to show.
const migrateLegacyCache = (cached: unknown): CachedMyBookmarks | null => {
  if (!Array.isArray(cached) || cached.length === 0) {
    return null;
  }

  // Caches written before 0.3.0 have no tags field and cannot be used.
  const [first] = cached as Partial<Bookmark>[];
  if (!Array.isArray(first?.tags)) {
    return null;
  }

  return { schemaVersion: MY_BOOKMARKS_CACHE_SCHEMA_VERSION, bookmarks: cached as Bookmark[] };
};

// Returns the cache in the current schema, or null when it cannot be used.
// An incompatible cache is left in place rather than deleted; a successful fetch overwrites it.
const toCompatibleCache = (cached: unknown): CachedMyBookmarks | null => {
  if (isCompatibleCache(cached)) {
    return cached;
  }

  return migrateLegacyCache(cached);
};

export const useMyBookmarks = () => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const [cached, setCached] = useCachedState<CachedMyBookmarks | null>(CACHED_KEY_MY_BOOKMARKS, null);
  const compatibleCache = useMemo(() => toCompatibleCache(cached), [cached]);

  const { enabledSpaceIds } = useEnabledSpaces();

  const r = trpc.bookmark.listAll.useQuery(
    {
      spaceIds: enabledSpaceIds || [],
    },
    {
      enabled: !!sessionToken && !!enabledSpaceIds,
      initialData: () => {
        if (!compatibleCache) {
          return undefined;
        }

        console.info("Cache hit useBookmarks");
        return compatibleCache.bookmarks;
      },
    },
  );

  useEffect(() => {
    if (!r.data) return;

    setCached({ schemaVersion: MY_BOOKMARKS_CACHE_SCHEMA_VERSION, bookmarks: r.data });
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
