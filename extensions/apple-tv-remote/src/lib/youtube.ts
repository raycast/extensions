/**
 * Keyless YouTube lookups for "play <query> on YouTube" and "play the latest
 * <channel> video". Reads the video and channel IDs out of youtube.com's own
 * search and channel pages, and titles from its public oEmbed endpoint.
 */

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15",
  "Accept-Language": "en",
  // Skips the EU cookie-consent interstitial, which has no video IDs on it.
  Cookie: "SOCS=CAI",
};
const VIDEO_ID = /"videoId":"([\w-]{11})"/;

async function firstMatch(url: string, pattern: RegExp): Promise<string | undefined> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`YouTube lookup failed (HTTP ${response.status})`);
  return (await response.text()).match(pattern)?.[1];
}

const search = (query: string, filter = "") =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}${filter}`;

/** The top search result's video ID. */
export const topVideo = (query: string) => firstMatch(search(query), VIDEO_ID);

/** The newest full-length upload from the channel best matching `name`. The Videos tab leaves out Shorts. */
export async function latestUpload(name: string): Promise<string | undefined> {
  const channel = await firstMatch(search(name, "&sp=EgIQAg%253D%253D"), /"channelId":"(UC[\w-]{22})"/);
  return channel && firstMatch(`https://www.youtube.com/channel/${channel}/videos`, VIDEO_ID);
}

/** "Title" by Channel, for the confirmation HUD. */
export async function describeVideo(id: string): Promise<string> {
  const response = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`);
  const { title, author_name } = (await response.json()) as { title?: string; author_name?: string };
  return title ? `“${title}”${author_name ? ` by ${author_name}` : ""}` : "the video";
}
