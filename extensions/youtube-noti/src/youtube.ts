const BASE = "https://www.googleapis.com/youtube/v3";

export type StreamKind = "live" | "upcoming" | "ended";

export interface LiveStream {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
  viewerCount: number;
  url: string;
  actualStartTime?: string;
  scheduledStartTime?: string;
  actualEndTime?: string;
  kind: StreamKind;
}

function parseChannelIds(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"))
    .map((s) =>
      s.replace(/^.*\/channel\//i, "").replace(/^.*\?channel_id=/i, ""),
    )
    .filter(Boolean);
}

/** Get live video IDs for a single channel */
async function searchLiveForChannel(
  apiKey: string,
  channelId: string,
): Promise<string[]> {
  const url = new URL(`${BASE}/search`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("part", "id");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("type", "video");
  url.searchParams.set("eventType", "live");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    items?: { id?: { videoId?: string } }[];
  };
  const ids = (data.items ?? [])
    .map((i) => i.id?.videoId)
    .filter(Boolean) as string[];
  return ids;
}

/** Get snippet, statistics, liveStreamingDetails for video IDs (max 50 per call) */
async function getVideoDetails(
  apiKey: string,
  videoIds: string[],
): Promise<LiveStream[]> {
  if (videoIds.length === 0) return [];

  const url = new URL(`${BASE}/videos`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("part", "snippet,statistics,liveStreamingDetails");
  url.searchParams.set("id", videoIds.slice(0, 50).join(","));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        channelId?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: {
          maxres?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
      statistics?: { viewCount?: string };
      liveStreamingDetails?: {
        concurrentViewers?: string;
        actualStartTime?: string;
        scheduledStartTime?: string;
        actualEndTime?: string;
      };
    }>;
  };

  const streams: LiveStream[] = [];
  for (const item of data.items ?? []) {
    const sn = item.snippet;
    const thumbnails = sn?.thumbnails;
    const thumb =
      thumbnails?.maxres?.url ??
      thumbnails?.high?.url ??
      thumbnails?.medium?.url ??
      thumbnails?.default?.url ??
      "";
    const liveDetails = (
      item as {
        liveStreamingDetails?: {
          concurrentViewers?: string;
          actualStartTime?: string;
          scheduledStartTime?: string;
          actualEndTime?: string;
        };
      }
    ).liveStreamingDetails;
    const viewers = Number(liveDetails?.concurrentViewers ?? 0);
    const totalViews = Number(item.statistics?.viewCount ?? 0);
    streams.push({
      id: item.id,
      title: sn?.title ?? "Live",
      channelId: sn?.channelId ?? "",
      channelTitle: sn?.channelTitle ?? "Channel",
      publishedAt: sn?.publishedAt ?? "",
      thumbnail: thumb,
      viewerCount: viewers || totalViews,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      actualStartTime: liveDetails?.actualStartTime,
      scheduledStartTime: liveDetails?.scheduledStartTime,
      actualEndTime: liveDetails?.actualEndTime,
      kind: "live",
    });
  }
  return streams;
}

export async function getLiveStreams(
  apiKey: string,
  channelIdsRaw: string,
): Promise<LiveStream[]> {
  const channelIds = parseChannelIds(channelIdsRaw);
  if (channelIds.length === 0) return [];

  const allVideoIds: string[] = [];
  for (const channelId of channelIds) {
    try {
      const ids = await searchLiveForChannel(apiKey, channelId);
      allVideoIds.push(...ids);
    } catch (e) {
      console.warn(`Failed to fetch live for channel ${channelId}:`, e);
    }
  }

  if (allVideoIds.length === 0) return [];

  const streams = await getVideoDetails(apiKey, allVideoIds);
  return streams.sort((a, b) => b.viewerCount - a.viewerCount);
}

export { parseChannelIds };
