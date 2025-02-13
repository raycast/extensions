import { Cache } from "@raycast/api";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { Bookmark } from "../types";

const cache = new Cache();
const cachedBookmarks = cache.get("bookmarks");

export const useBookmarks = (p: { sessionToken: string; spaceIds: string[]; me?: RouterOutputs["user"]["me"] }) => {
  const { sessionToken, spaceIds, me } = p;
  const r = trpc.bookmark.listAll.useQuery(
    {
      spaceIds,
    },
    {
      enabled: !!sessionToken && !!me, // && me.isFetched,
      initialData: cachedBookmarks
        ? () => {
            // TODO: 호환성 검사 후 리턴해야함.
            // 아니면 스키마 버전마다 key를 바꾸는 방법도 있을 듯.
            const initialData: Bookmark[] = JSON.parse(cachedBookmarks);
            if (!initialData[0]?.tags) {
              // 0.3.0 이전 버전의 캐시는 제거.
              return undefined;
            }
            console.info("Cache hit useBookmarks");
            return initialData;
          }
        : undefined,
    },
  );

  return r;
};
