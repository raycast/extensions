import { getPopularVideos } from "../lib/youtubeapi";
import { videoUrl } from "../lib/urls";

/** Get videos from YouTube's current most popular chart. */
export default async function tool() {
  const videos = await getPopularVideos();
  return (videos ?? []).slice(0, 10).map((video) => ({
    title: video.title,
    channel: video.channelTitle,
    views: video.statistics?.viewCount,
    url: videoUrl(video.id),
  }));
}
