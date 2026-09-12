import { DownloadItemData } from "../schema";

export const formatMediaDuration = (durationInSeconds: number): string => {
  const date = new Date(0);
  date.setSeconds(durationInSeconds);
  return date.toISOString().substr(11, 8);
};

export const getYouTubeThumbnail = (download: DownloadItemData): string | null => {
  if (download?.host !== "youtube.com") return null;

  const youtubeVideoId = (download?.link || "").match(/[?&]v=([^?&]+)/)?.[1] || "";

  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/0.jpg`;

  return thumbnailUrl;
};
