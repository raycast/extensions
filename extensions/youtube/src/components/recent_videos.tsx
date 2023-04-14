import { Cache, getPreferenceValues } from "@raycast/api";
import { Video } from "../lib/youtubeapi";
import { Preferences } from "../lib/types";

const { griditemsize } = getPreferenceValues<Preferences>();

const cache = new Cache();

export const getRecentVideos = () => getCachedVideos("recent-videos");
export const getPinnedVideos = () => getCachedVideos("pinned-videos");

export const getCachedVideos = (key: string): string[] => {
  const videos = cache.get(key);
  return videos ? JSON.parse(videos) : [];
};

export const addRecentVideo = (video: Video) => {
  const pinned = getPinnedVideos();
  if (pinned.find((id: string) => id === video.id)) return;
  removeRecentVideo(video.id);
  const recent = getRecentVideos();
  recent.unshift(video.id);
  recent.splice(griditemsize * 2);
  cache.set("recent-videos", JSON.stringify(recent));
};

export const addPinnedVideo = (video: Video) => {
  removeRecentVideo(video.id);
  removePinnedVideo(video.id);
  const pinned = getPinnedVideos();
  pinned.unshift(video.id);
  cache.set("pinned-videos", JSON.stringify(pinned));
};

export const removeVideo = (key: string, id: string) => {
  const videos = getCachedVideos(key);
  cache.set(key, JSON.stringify(videos.filter((v) => v !== id)));
};

export const removeRecentVideo = (id: string) => removeVideo("recent-videos", id);
export const clearRecentVideos = () => cache.remove("recent-videos");
export const removePinnedVideo = (id: string) => removeVideo("pinned-videos", id);
export const clearPinnedVideos = () => cache.remove("pinned-videos");
