import { LocalStorage } from "@raycast/api";
import { fetchVideoData } from "../utils/youtube";

type Input = {
  /**
   * The YouTube video URL or video ID to summarize
   */
  url: string;
};

export type HistoryEntry = {
  videoId: string;
  title: string;
  ownerChannelName: string;
  duration: string;
  video_url: string;
  thumbnail: string | undefined;
  timestamp: number;
};

const HISTORY_KEY = "history";

async function saveToHistory(entry: HistoryEntry) {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
  history.unshift(entry);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/** Fetch a YouTube video transcript and metadata for summarization */
export default async function tool(input: Input) {
  const { videoData, transcript } = await fetchVideoData(input.url);

  await saveToHistory({
    videoId: videoData.videoId,
    title: videoData.title,
    ownerChannelName: videoData.ownerChannelName,
    duration: videoData.duration,
    video_url: videoData.video_url,
    thumbnail: videoData.thumbnail?.url,
    timestamp: Date.now(),
  });

  return [
    `# ${videoData.title}`,
    "",
    `- **Channel:** ${videoData.ownerChannelName}`,
    `- **Duration:** ${videoData.duration}`,
    `- **URL:** ${videoData.video_url}`,
    "",
    "## Transcript",
    "",
    transcript,
  ].join("\n");
}
