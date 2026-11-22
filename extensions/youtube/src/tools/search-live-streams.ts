import { searchVideos } from "../lib/youtubeapi";
import { videoUrl } from "../lib/urls";

type Input = {
  /** The words or topic to search for among live YouTube streams. */
  query: string;
};

/** Search for live YouTube streams matching a query. */
export default async function tool({ query }: Input) {
  const videos = await searchVideos(query, undefined, { eventType: "live" });
  return videos.slice(0, 10).map((video) => ({
    title: video.title,
    channel: video.channelTitle,
    description: video.description,
    url: videoUrl(video.id),
  }));
}
