import { useFetch } from "@raycast/utils";
import BetterCache from "../modules/better-cache";

const CACHE_TIMEOUT = 10 * 60; // 10 minutes

type UserThumbnailData = {
  targetId: number;
  state: string;
  imageUrl: string;
  version: string;
};

type UserThumbnailResponse = {
  data: UserThumbnailData[];
};

const cache = new BetterCache<string>({
  namespace: "roblox-user-thumbnails",
  capacity: 100000,
  defaultTTL: CACHE_TIMEOUT,
});

export function useUserThumbnail(userId: number) {
  const cachedThumbnail = cache.get(userId.toString());

  const { data: thumbnailData, isLoading: thumbnailDataLoading } = useFetch<UserThumbnailResponse>(
    `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`,
    {
      execute: !cachedThumbnail,
    },
  );

  let thumbnailUrl = cachedThumbnail || "";

  if (!thumbnailDataLoading && thumbnailData && thumbnailData.data.length > 0) {
    const imgUrl = thumbnailData.data[0].imageUrl;
    if (imgUrl) {
      thumbnailUrl = imgUrl;
      cache.set(userId.toString(), imgUrl);
    }
  }

  return {
    data: thumbnailUrl,
    isLoading: !cachedThumbnail && thumbnailDataLoading,
  };
}
