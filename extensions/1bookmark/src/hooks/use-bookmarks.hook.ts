import { trpc } from "@/utils/trpc.util";
import { CachedMyBookmarks } from "../types";
import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import {
  CACHED_KEY_SESSION_TOKEN,
  CACHED_KEY_MY_BOOKMARKS,
  MY_BOOKMARKS_CACHE_SCHEMA_VERSION,
} from "@/utils/constants.util";
import { useEnabledSpaces } from "./use-enabled-spaces.hook";

// 스키마 버전 필드 없이 북마크 배열이 그대로 저장되던 구버전 캐시까지 고려해
// 현재 스키마 버전과 호환되는 캐시인지 런타임에 검사한다.
const isCompatibleCache = (cached: unknown): cached is CachedMyBookmarks => {
  if (typeof cached !== "object" || cached === null || Array.isArray(cached)) {
    return false;
  }

  const { schemaVersion, bookmarks } = cached as Partial<CachedMyBookmarks>;
  return schemaVersion === MY_BOOKMARKS_CACHE_SCHEMA_VERSION && Array.isArray(bookmarks);
};

export const useMyBookmarks = () => {
  const [sessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const [cached, setCached] = useCachedState<CachedMyBookmarks | null>(CACHED_KEY_MY_BOOKMARKS, null);

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

        // 확장 업데이트로 캐시 스키마가 바뀐 경우(버전 불일치 또는 버전 필드 부재)
        // 캐시를 폐기하고 서버에서 다시 가져온다.
        if (!isCompatibleCache(cached)) {
          setCached(null);
          return undefined;
        }

        console.info("Cache hit useBookmarks");
        return cached.bookmarks;
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
