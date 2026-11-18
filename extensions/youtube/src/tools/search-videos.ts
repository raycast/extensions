import { searchVideos } from "../lib/youtubeapi";
import { videoUrl } from "../lib/urls";

type Input = {
  /** The words or topic to search for on YouTube. */
  query: string;
};

/** Search YouTube for videos matching a query. */
export default async function tool({ query }: Input) {
  const videos = await searchVideos(query);
  return videos.slice(0, 10).map((video) => ({
    title: video.title,
    channel: video.channelTitle,
    publishedAt: video.publishedAt,
    description: video.description,
    views: video.statistics?.viewCount,
    url: videoUrl(video.id),
  }));
}
