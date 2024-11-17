import { useFetch } from "@raycast/utils";

type HeadshotResponse = {
  data: Array<{
    requestId: string;
    errorCode: number;
    errorMessage: string;
    targetId: number;
    state: string;
    imageUrl: string;
    version: string;
  }>;
};

export function useBatchHeadshot(userIds: number[]) {
  const requestBody = userIds.map((userId) => ({
    requestId: `${userId}:undefined:AvatarHeadshot:150x150:webp:regular`,
    type: "AvatarHeadShot",
    targetId: userId,
    format: "webp",
    size: "150x150",
  }));

  const { data: headshotData, isLoading: headshotDataLoading } = useFetch<HeadshotResponse>(
    "https://thumbnails.roblox.com/v1/batch",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  const headshots: Record<number, string> = {};
  if (headshotData) {
    headshotData.data.forEach((data) => {
      headshots[data.targetId] = data.imageUrl;
    });
  }

  return {
    data: headshots,
    isLoading: headshotDataLoading,
  };
}
