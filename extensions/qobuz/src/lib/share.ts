import type { Clipboard } from "@raycast/api";
import type { Track } from "@kud/qobuz";
import { deepLink } from "./client";
import { isLikelyMatch } from "./resolve";

// Outbound direction: a Qobuz track → where to find it elsewhere. The inbound
// direction (a foreign link → Qobuz) lives in resolve.ts.

export type Platform = "qobuz" | "deezer" | "apple" | "spotify" | "tidal" | "songlink";

// "exact" is an id-level match (own link, ISRC). "approximate" passed the
// text-match guard. "search" lands on a results page, not the track — the
// message says so, because a friend who taps it should know.
export type Confidence = "exact" | "approximate" | "search";

export type ShareLink = { platform: Platform; url: string; confidence: Confidence };

const FETCH_TIMEOUT_MS = 5000;

const PLATFORM_LABEL: Record<Platform, string> = {
  qobuz: "Qobuz",
  deezer: "Deezer",
  apple: "Apple Music",
  spotify: "Spotify",
  tidal: "Tidal",
  songlink: "All platforms",
};

const fetchJson = async <T>(url: string): Promise<T | undefined> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
  if (!res || !res.ok) return undefined;
  return (await res.json().catch(() => undefined)) as T | undefined;
};

export const spotifySearchUrl = (query: string) => `https://open.spotify.com/search/${encodeURIComponent(query)}`;

export const ytMusicSearchUrl = (query: string) => `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;

export const appleMusicSearchUrl = (query: string) =>
  `https://music.apple.com/search?term=${encodeURIComponent(query)}`;

export const tidalSearchUrl = (query: string) => `https://tidal.com/search?q=${encodeURIComponent(query)}`;

export const deezerByIsrc = async (isrc: string): Promise<{ id: number; link: string } | undefined> => {
  const track = await fetchJson<{ id?: number; link?: string }>(`https://api.deezer.com/track/isrc:${isrc}`);
  return track?.id && track.link ? { id: track.id, link: track.link } : undefined;
};

type ItunesSearch = { results?: { artistName?: string; trackName?: string; trackViewUrl?: string }[] };

// Apple appends uo= to search results; a share message reads better without it.
const withoutAffiliateTag = (url: string): string => {
  const parsed = new URL(url);
  parsed.searchParams.delete("uo");
  return parsed.toString();
};

// Apple no longer answers lookup?isrc=, so text search guarded by the same
// match test the Qobuz fallback uses.
const appleMusicByText = async (track: Track): Promise<string | undefined> => {
  const query = `${track.artist?.name ?? ""} ${track.title}`.trim();
  const data = await fetchJson<ItunesSearch>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`,
  );
  const source = { title: track.title, artist: track.artist?.name ?? "" };
  const hit = data?.results?.find(
    (c) => c.trackViewUrl && isLikelyMatch(source, { title: c.trackName ?? "", artist: { name: c.artistName } }),
  );
  return hit?.trackViewUrl ? withoutAffiliateTag(hit.trackViewUrl) : undefined;
};

export const shareQuery = (track: Track): string => `${track.artist?.name ?? ""} ${track.title}`.trim();

export const shareLinks = async (track: Track): Promise<ShareLink[]> => {
  const query = shareQuery(track);
  const [deezer, apple] = await Promise.all([
    track.isrc ? deezerByIsrc(track.isrc) : Promise.resolve(undefined),
    appleMusicByText(track),
  ]);

  const links: ShareLink[] = [{ platform: "qobuz", url: deepLink.track(track.id), confidence: "exact" }];
  if (deezer) links.push({ platform: "deezer", url: deezer.link, confidence: "exact" });
  links.push(
    apple
      ? { platform: "apple", url: apple, confidence: "approximate" }
      : { platform: "apple", url: appleMusicSearchUrl(query), confidence: "search" },
  );
  links.push({ platform: "spotify", url: spotifySearchUrl(query), confidence: "search" });
  links.push({ platform: "tidal", url: tidalSearchUrl(query), confidence: "search" });
  // song.link resolves every other service client-side when the friend opens it.
  if (deezer) links.push({ platform: "songlink", url: `https://song.link/d/${deezer.id}`, confidence: "exact" });
  return links;
};

export const shareTitle = (track: Track): string => `${track.artist?.name ?? "?"} — ${track.title}`;

const lineLabel = ({ platform, confidence }: ShareLink): string =>
  confidence === "search" ? `${PLATFORM_LABEL[platform]} (search)` : PLATFORM_LABEL[platform];

export const formatShareMessage = (track: Track, links: ShareLink[]): string =>
  [`🎵 ${shareTitle(track)}`, "", ...links.map((link) => `${lineLabel(link)}: ${link.url}`)].join("\n");

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Rich-text destinations (Slack, Notion, Mail) take this; hiding the URLs
// behind the names is what lets it collapse to one line.
const htmlLink = ({ platform, url, confidence }: ShareLink): string => {
  const anchor = `<a href="${escapeHtml(url)}">${PLATFORM_LABEL[platform]}</a>`;
  return confidence === "search" ? `${anchor} (search)` : anchor;
};

export const formatShareHtml = (track: Track, links: ShareLink[]): string =>
  `🎵 <b>${escapeHtml(shareTitle(track))}</b><br>\n${links.map(htmlLink).join(" · ")}`;

export const shareClipboard = (track: Track, links: ShareLink[]): Clipboard.Content => ({
  text: formatShareMessage(track, links),
  html: formatShareHtml(track, links),
});

export const countServices = (links: ShareLink[]): number => links.filter((l) => l.platform !== "songlink").length;
