import { useFetch } from "@raycast/utils";
import BetterCache from "../modules/better-cache";

const CACHE_TIMEOUT = 10 * 60; // 10 minutes

type HeadshotData = {
  requestId: string;
  errorCode: number;
  errorMessage: string;
  targetId: number;
  state: string;
  imageUrl: string;
  version: string;
};

type HeadshotResponse = {
  data: HeadshotData[];
};

const cache = new BetterCache<string>({
  namespace: "roblox-headshots",
  capacity: 100000,
  defaultTTL: CACHE_TIMEOUT,
});

export function useBatchHeadshot(userIds: number[], useCache?: boolean) {
  const ignoreCache = useCache == false;

  const headshots: Record<number, string> = {};

  const sortedUserIds = [...userIds].sort((a, b) => a.toString().localeCompare(b.toString()));

  const uncachedUserIds = sortedUserIds.filter((userId) => {
    if (!ignoreCache) {
      const cachedUrl = cache.get(userId.toString());
      if (cachedUrl) {
        headshots[userId] = cachedUrl;
        return false;
      }
    }
    return true;
  });

  const requestBody = sortedUserIds.map((userId) => ({
    requestId: `${userId}:undefined:AvatarHeadshot:150x150:webp:regular`,
    type: "AvatarHeadShot",
    targetId: userId,
    format: "webp",
    size: "150x150",
  }));

  const {
    data: headshotData,
    isLoading: headshotDataLoading,
    revalidate,
  } = useFetch<HeadshotResponse>("https://thumbnails.roblox.com/v1/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    execute: uncachedUserIds.length > 0,
  });

  function revalidateData() {
    userIds.forEach((id) => {
      cache.remove(id.toString());
    });
    revalidate();
  }

  if (!headshotDataLoading && headshotData) {
    headshotData.data.forEach((data) => {
      headshots[data.targetId] = data.imageUrl;
      cache.set(data.targetId.toString(), data.imageUrl);
    });
  }

  return {
    data: headshots,
    isLoading: headshotDataLoading,
    revalidate: revalidateData,
  };
}

export function useHeadshot(userId: number, useCache?: boolean) {
  const { data, isLoading, revalidate } = useBatchHeadshot([userId], useCache);

  let userHeadshot = null;
  if (!isLoading && data) {
    userHeadshot = data[userId];
  }

  return {
    data: userHeadshot,
    isLoading,
    revalidate,
  };
}
