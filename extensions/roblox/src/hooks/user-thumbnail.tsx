import { useFetch } from "@raycast/utils";

type UserThumbnailResponse = {
  data: Array<{
    targetId: number;
    state: string;
    imageUrl: string;
    version: string;
  }>;
};

export function useUserThumbnail(userId: number) {
  const { data: thumbnailData, isLoading: thumbnailDataLoading } = useFetch<UserThumbnailResponse>(
    `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=150x200&format=Png&isCircular=false`,
  );

  let thumbnailUrl = "";
  if (!thumbnailDataLoading && thumbnailData) {
    const imgUrl = thumbnailData.data[0].imageUrl;
    if (imgUrl) {
      thumbnailUrl = imgUrl;
    }
  }

  return {
    data: thumbnailUrl,
    isLoading: thumbnailDataLoading,
  };
}
