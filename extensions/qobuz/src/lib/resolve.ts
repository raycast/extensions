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

export type LinkKind = "track" | "album" | "playlist" | "artist" | "podcast" | "other";

// Qobuz album ids are alphanumeric: /album/<slug>/<id> on the store,
// /album/<id> on open.qobuz.com and play.qobuz.com.
const QOBUZ_ALBUM = /\/album\/(?:[^/]+\/)?([a-z0-9]+)\/?$/i;

// YouTube Music albums are playlists whose id starts OLAK5uy_, or browse pages
// whose id starts MPREb_.
const isYouTubeAlbum = (url: URL): boolean =>
  (url.pathname === "/playlist" && (url.searchParams.get("list") ?? "").startsWith("OLAK5uy_")) ||
  url.pathname.startsWith("/browse/MPREb_");

/**
 * What kind of page a link from a supported service points at, offline; for
 * any other link, undefined.
 */
export const linkKind = (input: string): LinkKind | undefined => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return undefined;
  }
  const host = url.hostname;
  const path = url.pathname;
  if (isQobuz(host)) {
    if (/\/track\/\d+/.test(path)) return "track";
    if (QOBUZ_ALBUM.test(path)) return "album";
    if (path.includes("/playlist/")) return "playlist";
    if (/\/(artist|interpreter)\//.test(path)) return "artist";
    return "other";
  }
  if (isSpotify(host)) {
    if (path.includes("/track/")) return "track";
    if (path.includes("/album/")) return "album";
    if (path.includes("/playlist/")) return "playlist";
    if (path.includes("/artist/")) return "artist";
    if (/\/(show|episode)\//.test(path)) return "podcast";
    return "other";
  }
  if (isYouTube(host)) {
    if (path === "/watch" || host.endsWith("youtu.be")) return "track";
    if (isYouTubeAlbum(url)) return "album";
    if (path === "/playlist") return "playlist";
    if (path.startsWith("/channel/") || path.startsWith("/@")) return "artist";
    return "other";
  }
  return undefined;
};

/**
 * Cheap, offline check that a string is a single track or an album from a
 * supported service — the shape test of the resolvers without their network
 * round-trip, for deciding what to do with the clipboard.
 */
export const looksLikeOpenableLink = (input: string): boolean => {
  const kind = linkKind(input);
  return kind === "track" || kind === "album";
};

export type LinkService = "qobuz" | "spotify" | "youtube-music" | "youtube";

/** Which supported service a link points at, whatever kind of page it is. */
export const linkService = (input: string): LinkService | undefined => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return undefined;
  }
  const host = url.hostname;
  if (isQobuz(host)) return "qobuz";
  if (isSpotify(host)) return "spotify";
  if (host.endsWith("music.youtube.com")) return "youtube-music";
  if (isYouTube(host)) return "youtube";
  return undefined;
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

export type ResolvedAlbum = {
  title: string;
  artist: string;
  year?: number;
  tracksCount?: number;
};

export type AlbumOutcome =
  | { ok: true; direction: "to-qobuz"; album: ResolvedAlbum }
  | { ok: true; direction: "from-qobuz"; qobuzAlbumId: string }
  | { ok: false; reason: ResolveFailure };

// An album's og:title reads "Listen to Random Access Memories - Album by Daft
// Punk | Spotify" and its og:description "Daft Punk · album · 2013 · 13 songs".
export const parseSpotifyAlbum = (ogTitle: string, ogDescription: string): ResolvedAlbum | null => {
  const title = ogTitle.match(/^Listen to (.+) - \S+ by .+ \| Spotify$/)?.[1] ?? ogTitle;
  const parts = ogDescription.split(" · ");
  const artist = parts[0];
  if (!title || !artist) return null;
  const year = parts.find((part) => /^\d{4}$/.test(part));
  const tracksCount = ogDescription.match(/(\d+) songs?/)?.[1];
  return {
    title: decodeEntities(title),
    artist: decodeEntities(artist),
    year: year ? Number(year) : undefined,
    tracksCount: tracksCount ? Number(tracksCount) : undefined,
  };
};

const resolveSpotifyAlbum = async (url: string): Promise<ResolvedAlbum | null> => {
  const res = await fetch(url, { headers: { "User-Agent": CRAWLER_UA } });
  if (!res.ok) return null;
  const html = await res.text();
  const title = metaContent(html, "og:title");
  const description = metaContent(html, "og:description");
  return title && description ? parseSpotifyAlbum(title, description) : null;
};

// oEmbed names an album playlist but not its artist; its thumbnail is the
// first track's video, whose oEmbed author is the artist's "- Topic" channel.
const resolveYouTubeAlbum = async (url: string): Promise<ResolvedAlbum | null> => {
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  if (!res.ok) return null;
  const data = (await res.json()) as { title?: string; thumbnail_url?: string };
  const firstVideo = data.thumbnail_url?.match(/\/vi\/([^/]+)\//)?.[1];
  if (!data.title || !firstVideo) return null;
  const first = await resolveYouTube(`https://music.youtube.com/watch?v=${firstVideo}`);
  return first ? { title: data.title, artist: first.artist } : null;
};

export const resolveAlbumLink = async (input: string): Promise<AlbumOutcome> => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (linkKind(input) !== "album") return { ok: false, reason: "unsupported-type" };

  const host = url.hostname;
  if (isQobuz(host)) {
    const id = url.pathname.match(QOBUZ_ALBUM)?.[1];
    return id ? { ok: true, direction: "from-qobuz", qobuzAlbumId: id } : { ok: false, reason: "unsupported-type" };
  }
  const album = isSpotify(host) ? await resolveSpotifyAlbum(input) : await resolveYouTubeAlbum(input);
  return album ? { ok: true, direction: "to-qobuz", album } : { ok: false, reason: "unknown" };
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

type DeezerAlbumSearch = { data?: { id: number; title: string; artist?: { name?: string }; nb_tracks?: number }[] };
type DeezerAlbum = { upc?: string };

export const findUpc = async (album: ResolvedAlbum): Promise<string | undefined> => {
  const res = await fetch(
    `https://api.deezer.com/search/album?q=${encodeURIComponent(`${album.artist} ${album.title}`)}&limit=5`,
  );
  if (!res.ok) return undefined;
  const hits = ((await res.json()) as DeezerAlbumSearch).data ?? [];
  const match = pickAlbumMatch(
    album,
    hits.map((hit) => ({ ...hit, tracksCount: hit.nb_tracks })),
  );
  if (!match) return undefined;
  const albumRes = await fetch(`https://api.deezer.com/album/${match.album.id}`);
  if (!albumRes.ok) return undefined;
  return ((await albumRes.json()) as DeezerAlbum).upc;
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

export type AlbumCandidate = {
  title: string;
  artist?: { name?: string };
  upc?: string;
  year?: number;
  tracksCount?: number;
};

// Deezer drops the leading zero Qobuz keeps on a 12-digit UPC.
const sameUpc = (a: string, b: string): boolean => a.replace(/^0+/, "") === b.replace(/^0+/, "");

/**
 * The candidate that is this album: the one sharing its UPC is exact; failing
 * that, among those passing isLikelyMatch, the one whose year and track count
 * agree with the source, so a deluxe edition or a reissue loses to the album
 * that was shared. Ties keep the search ranking.
 */
export const pickAlbumMatch = <T extends AlbumCandidate>(
  source: ResolvedAlbum,
  candidates: T[],
  upc?: string,
): { album: T; exact: boolean } | undefined => {
  const byUpc = upc ? candidates.find((candidate) => candidate.upc && sameUpc(candidate.upc, upc)) : undefined;
  if (byUpc) return { album: byUpc, exact: true };

  const agreement = (candidate: T): number =>
    Number(source.year !== undefined && candidate.year === source.year) +
    Number(source.tracksCount !== undefined && candidate.tracksCount === source.tracksCount);
  const likely = candidates.filter((candidate) => isLikelyMatch(source, candidate));
  const best = likely.reduce<T | undefined>(
    (best, candidate) => (best === undefined || agreement(candidate) > agreement(best) ? candidate : best),
    undefined,
  );
  return best ? { album: best, exact: false } : undefined;
};

const decodeEntities = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
