import { getPreferenceValues, type Clipboard } from "@raycast/api";
import type { Track } from "@kud/qobuz";
import { deepLink } from "./client";
import { isLikelyMatch } from "./resolve";

// Outbound direction: a Qobuz track → where to find it elsewhere. The inbound
// direction (a foreign link → Qobuz) lives in resolve.ts.

export type Platform = "qobuz" | "deezer" | "apple" | "spotify" | "tidal" | "songlink";

// "exact" is an id-level match (own link, ISRC). "approximate" passed the
// text-match guard. "search" lands on a results page, not the track; the
// message reads the same either way, and the in-app actions say which it is.
export type Confidence = "exact" | "approximate" | "search";

export type ShareLink = { platform: Platform; url: string; confidence: Confidence };

const FETCH_TIMEOUT_MS = 4000;

// MusicBrainz allows one request per second per IP and is only enrichment, so
// it gets a shorter leash than the services the message cannot do without.
const MUSICBRAINZ_TIMEOUT_MS = 2000;

// MusicBrainz asks every client to identify itself with a way to reach it.
const MUSICBRAINZ_USER_AGENT = "QobuzRaycastExtension/1.0 (https://github.com/raycast/extensions)";

const PLATFORM_LABEL: Record<Platform, string> = {
  qobuz: "Qobuz",
  deezer: "Deezer",
  apple: "Apple Music",
  spotify: "Spotify",
  tidal: "Tidal",
  songlink: "All platforms",
};

const PREFERENCE_KEY: Record<Exclude<Platform, "qobuz">, keyof Preferences> = {
  spotify: "includeSpotify",
  apple: "includeApple",
  deezer: "includeDeezer",
  tidal: "includeTidal",
  songlink: "includeSonglink",
};

export const enabledLinks = (links: ShareLink[]): ShareLink[] => {
  const preferences = getPreferenceValues<Preferences>();
  return links.filter((link) => link.platform === "qobuz" || preferences[PREFERENCE_KEY[link.platform]] !== false);
};

const fetchJson = async <T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<T | undefined> => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }).catch(() => null);
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

type MusicBrainzIsrc = { recordings?: { relations?: { url?: { resource?: string } }[] }[] };

type StreamingLinks = { spotify?: string; tidal?: string; apple?: string };

// The relation type ("streaming", "free streaming") varies, so a link is
// trusted by its host alone.
const STREAMING_HOSTS: Record<keyof StreamingLinks, (url: URL) => boolean> = {
  spotify: (url) => url.hostname === "open.spotify.com" && url.pathname.startsWith("/track/"),
  tidal: (url) => url.hostname.endsWith("tidal.com") && url.pathname.includes("/track/"),
  apple: (url) => url.hostname === "music.apple.com",
};

const parseUrl = (value: string): URL | undefined => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

// ISRC → exact track pages, from MusicBrainz's crowd-sourced URL relations.
// Coverage is patchy, so a miss falls back to search, never to an error.
const streamingByIsrc = async (isrc: string): Promise<StreamingLinks> => {
  const data = await fetchJson<MusicBrainzIsrc>(
    `https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?inc=url-rels&fmt=json`,
    { headers: { "User-Agent": MUSICBRAINZ_USER_AGENT, Accept: "application/json" } },
    MUSICBRAINZ_TIMEOUT_MS,
  );
  const urls = (data?.recordings ?? [])
    .flatMap((recording) => recording.relations ?? [])
    .map((relation) => relation.url?.resource && parseUrl(relation.url.resource))
    .filter((url): url is URL => Boolean(url));

  const links: StreamingLinks = {};
  for (const platform of Object.keys(STREAMING_HOSTS) as (keyof StreamingLinks)[]) {
    links[platform] = urls.find(STREAMING_HOSTS[platform])?.toString();
  }
  return links;
};

type ItunesSearch = {
  results?: { artistName?: string; trackName?: string; trackViewUrl?: string; trackId?: number }[];
};

// Apple appends uo= to search results; a share message reads better without it.
const withoutAffiliateTag = (url: string): string => {
  const parsed = new URL(url);
  parsed.searchParams.delete("uo");
  return parsed.toString();
};

// Apple no longer answers lookup?isrc=, so text search guarded by the same
// match test the Qobuz fallback uses.
const appleMusicByText = async (track: Track): Promise<{ id: number; link: string } | undefined> => {
  const query = `${track.artist?.name ?? ""} ${track.title}`.trim();
  const data = await fetchJson<ItunesSearch>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`,
  );
  const source = { title: track.title, artist: track.artist?.name ?? "" };
  const hit = data?.results?.find(
    (c) => c.trackViewUrl && isLikelyMatch(source, { title: c.trackName ?? "", artist: { name: c.artistName } }),
  );
  return hit?.trackViewUrl && hit.trackId
    ? { id: hit.trackId, link: withoutAffiliateTag(hit.trackViewUrl) }
    : undefined;
};

const settledValue = <T>(result: PromiseSettledResult<T | undefined>): T | undefined =>
  result.status === "fulfilled" ? result.value : undefined;

export const shareQuery = (track: Track): string => `${track.artist?.name ?? ""} ${track.title}`.trim();

// Each service falls back on its own, so one slow or failing lookup costs one
// link its precision rather than costing the whole message.
export const shareLinks = async (track: Track): Promise<ShareLink[]> => {
  const query = shareQuery(track);
  const [deezerResult, appleResult, streamingResult] = await Promise.allSettled([
    track.isrc ? deezerByIsrc(track.isrc) : Promise.resolve(undefined),
    appleMusicByText(track),
    track.isrc ? streamingByIsrc(track.isrc) : Promise.resolve(undefined),
  ]);
  const deezer = settledValue(deezerResult);
  const apple = settledValue(appleResult);
  const streaming = settledValue(streamingResult) ?? {};

  const exactOr = (platform: Platform, url: string | undefined, searchUrl: string): ShareLink =>
    url ? { platform, url, confidence: "exact" } : { platform, url: searchUrl, confidence: "search" };

  const appleLink: ShareLink = streaming.apple
    ? { platform: "apple", url: streaming.apple, confidence: "exact" }
    : apple
      ? { platform: "apple", url: apple.link, confidence: "approximate" }
      : { platform: "apple", url: appleMusicSearchUrl(query), confidence: "search" };

  // Fixed order, never sorted by confidence, so a friend finds their service
  // in the same place every time.
  const links: ShareLink[] = [
    { platform: "qobuz", url: deepLink.track(track.id), confidence: "exact" },
    exactOr("spotify", streaming.spotify, spotifySearchUrl(query)),
    appleLink,
  ];
  if (deezer) links.push({ platform: "deezer", url: deezer.link, confidence: "exact" });
  links.push(exactOr("tidal", streaming.tidal, tidalSearchUrl(query)));

  // song.link resolves every other service client-side when the friend opens it.
  const songlink = deezer ? `https://song.link/d/${deezer.id}` : apple ? `https://song.link/i/${apple.id}` : undefined;
  if (songlink) links.push({ platform: "songlink", url: songlink, confidence: "exact" });
  return links;
};

export const shareTitle = (track: Track): string => `${track.artist?.name ?? "?"} — ${track.title}`;

const isSonglink = (link: ShareLink): boolean => link.platform === "songlink";

export const formatShareMessage = (track: Track, links: ShareLink[]): string => {
  const line = (link: ShareLink) => `${PLATFORM_LABEL[link.platform]}: ${link.url}`;
  const services = links.filter((link) => !isSonglink(link)).map(line);
  const songlink = links.filter(isSonglink).map(line);
  return [`🎵 ${shareTitle(track)}`, "", ...services, ...(songlink.length ? ["", ...songlink] : [])].join("\n");
};

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Rich-text destinations (Slack, Notion, Mail) take this; hiding the URLs
// behind the names is what lets it collapse to one line.
const htmlLink = ({ platform, url }: ShareLink): string =>
  `<a href="${escapeHtml(url)}">${PLATFORM_LABEL[platform]}</a>`;

const htmlTitle = (track: Track): string => `🎵 <b>${escapeHtml(shareTitle(track))}</b>`;

export const formatShareHtml = (track: Track, links: ShareLink[]): string =>
  `${htmlTitle(track)}<br>\n${links.map(htmlLink).join(" · ")}`;

export const shareClipboard = (track: Track, links: ShareLink[]): Clipboard.Content => {
  const enabled = enabledLinks(links);
  return {
    text: formatShareMessage(track, enabled),
    html: formatShareHtml(track, enabled),
  };
};

export const countServices = (links: ShareLink[]): number => enabledLinks(links).filter((l) => !isSonglink(l)).length;
