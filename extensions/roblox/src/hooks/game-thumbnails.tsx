import { useFetch } from "@raycast/utils";

type GameThumbnailResponse = {
  data: Array<{
    universeId: number;
    error: null | string;
    thumbnails: Array<{
      targetId: number;
      state: string;
      imageUrl: string;
      version: string;
    }>;
  }>;
};

export function useGameThumbnails(universeId: number, max?: number) {
  const { data: thumbnailData, isLoading: thumbnailDataLoading } = useFetch<GameThumbnailResponse>(
    `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=10&defaults=true&size=480x270&format=Png&isCircular=false`,
  );

  const thumbnailUrls: string[] = [];
  if (thumbnailData) {
    thumbnailData.data[0]?.thumbnails.forEach((data) => {
      if (max && thumbnailUrls.length >= max) return;
      thumbnailUrls.push(data.imageUrl);
    });
  }

  return {
    data: thumbnailUrls,
    isLoading: thumbnailDataLoading,
  };
}
