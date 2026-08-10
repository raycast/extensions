// Spotify serves its rich preview metadata (og: tags) to link-unfurler
// crawlers, but a normal browser UA gets the JS web-player shell instead.
const CRAWLER_UA = "facebookexternalhit/1.1";

export type ResolvedTrack = {
  title: string;
  artist: string;
};

export type ResolveFailure = "invalid" | "qobuz" | "unsupported-type" | "unknown";

export type ResolveOutcome =
  | { ok: true; direction: "to-qobuz"; track: ResolvedTrack }
  | { ok: true; direction: "from-qobuz"; qobuzTrackId: number }
  | { ok: false; reason: ResolveFailure };

export const spotifySearchUrl = (query: string) => `https://open.spotify.com/search/${encodeURIComponent(query)}`;

export const ytMusicSearchUrl = (query: string) => `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;

export const deezerByIsrc = async (isrc: string): Promise<string | undefined> => {
  const res = await fetch(`https://api.deezer.com/track/isrc:${isrc}`).catch(() => null);
  if (!res || !res.ok) return undefined;
  const track = (await res.json()) as { link?: string };
  return track.link;
};

const isQobuz = (host: string) => host.endsWith("qobuz.com");

const isSpotify = (host: string) => host.endsWith("open.spotify.com");

const isYouTube = (host: string) =>
  host.endsWith("music.youtube.com") || host.endsWith("youtube.com") || host.endsWith("youtu.be");

const metaContent = (html: string, property: string): string | undefined =>
  html.match(new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, "i"))?.[1];

const resolveSpotify = async (url: string): Promise<ResolvedTrack | null> => {
  const res = await fetch(url, { headers: { "User-Agent": CRAWLER_UA } });
  if (!res.ok) return null;
  const html = await res.text();

  // og:title is the track title; og:description starts with the artist,
  // e.g. "Kid Cudi · Passion, Pain & Demon Slayin' · Song · 2016".
  const title = metaContent(html, "og:title");
  const artist = metaContent(html, "og:description")?.split(" · ")[0];
  if (title && artist) return { title: decodeEntities(title), artist: decodeEntities(artist) };

  // Fallback: parse the document title.
  const match = html.match(/<title>(.*?)<\/title>/i)?.[1]?.match(/^(.+?) - song(?: and lyrics)? by (.+?) \| Spotify/i);
  if (!match?.[1] || !match[2]) return null;
  return { title: decodeEntities(match[1]), artist: decodeEntities(match[2]) };
};

const resolveYouTube = async (url: string): Promise<ResolvedTrack | null> => {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const data = (await res.json()) as { title?: string; author_name?: string };
  if (!data.title || !data.author_name) return null;
  return {
    title: data.title,
    artist: data.author_name.replace(/ - Topic$/, ""),
  };
};

export const resolveLink = async (input: string): Promise<ResolveOutcome> => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const host = url.hostname;
  const ok = (track: ResolvedTrack | null): ResolveOutcome =>
    track ? { ok: true, direction: "to-qobuz", track } : { ok: false, reason: "unknown" };

  // A Qobuz track link is the reverse direction: find it on the other services.
  if (isQobuz(host)) {
    const match = url.pathname.match(/\/track\/(\d+)/);
    return match
      ? { ok: true, direction: "from-qobuz", qobuzTrackId: Number(match[1]) }
      : { ok: false, reason: "unsupported-type" };
  }
  // Only single tracks — reject albums, playlists, artists, podcasts, episodes.
  if (isSpotify(host))
    return url.pathname.includes("/track/")
      ? ok(await resolveSpotify(input))
      : { ok: false, reason: "unsupported-type" };
  if (isYouTube(host))
    return url.pathname === "/watch" || host.endsWith("youtu.be")
      ? ok(await resolveYouTube(input))
      : { ok: false, reason: "unsupported-type" };
  return { ok: false, reason: "unknown" };
};

type DeezerSearch = { data?: { id: number }[] };
type DeezerTrack = { isrc?: string };

const deezerSearch = async (query: string): Promise<number | undefined> => {
  const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`);
  if (!res.ok) return undefined;
  const data = (await res.json()) as DeezerSearch;
  return data.data?.[0]?.id;
};

export const findIsrc = async ({ title, artist }: ResolvedTrack): Promise<string | undefined> => {
  const id = (await deezerSearch(`artist:"${artist}" track:"${title}"`)) ?? (await deezerSearch(`${artist} ${title}`));
  if (id === undefined) return undefined;
  const res = await fetch(`https://api.deezer.com/track/${id}`);
  if (!res.ok) return undefined;
  const track = (await res.json()) as DeezerTrack;
  return track.isrc;
};

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\b(feat|ft|with)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenSet = (text: string): Set<string> => new Set(normalize(text).split(" ").filter(Boolean));

const overlap = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const token of a) if (b.has(token)) hits += 1;
  return hits / Math.min(a.size, b.size);
};

/**
 * Guards the approximate (text-search) fallback: a candidate only counts as a
 * match when its title strongly overlaps the source and they share an artist.
 * Prevents a confident-looking but wrong result (e.g. a different song by the
 * same artist) when the track simply isn't on Qobuz.
 */
export const isLikelyMatch = (
  resolved: ResolvedTrack,
  candidate: { title: string; artist?: { name?: string } },
): boolean => {
  const titleScore = overlap(tokenSet(resolved.title), tokenSet(candidate.title));
  const artistScore = overlap(tokenSet(resolved.artist), tokenSet(candidate.artist?.name ?? ""));
  return titleScore >= 0.6 && artistScore > 0;
};

const decodeEntities = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
