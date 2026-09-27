import { getPopularVideos } from "../lib/youtubeapi";

/** Get videos from YouTube's current most popular chart. */
export default async function tool() {
  const videos = await getPopularVideos();
  return (videos ?? []).slice(0, 10).map((video) => ({
    title: video.title,
    channel: video.channelTitle,
    views: video.statistics?.viewCount,
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }));
}
