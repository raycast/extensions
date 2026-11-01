import type { Transport } from "@kud/qobuz";
import { findUpc, pickAlbumMatch, resolveAlbumLink, type ResolveFailure } from "./resolve";

export type QobuzAlbum = {
  id: string;
  title: string;
  artist?: { name: string };
  upc?: string;
  label?: string;
  year?: number;
  tracksCount?: number;
  duration?: number;
  hires?: boolean;
  cover?: string;
  tracks: { title: string; duration?: number }[];
};

type RawAlbum = {
  id: string | number;
  title: string;
  artist?: { name: string };
  upc?: string;
  label?: { name?: string };
  release_date_original?: string;
  released_at?: number;
  tracks_count?: number;
  duration?: number;
  hires?: boolean;
  image?: { large?: string; small?: string };
  tracks?: { items?: { title: string; duration?: number }[] };
};

const releaseYear = (raw: RawAlbum): number | undefined => {
  if (raw.release_date_original) return Number(raw.release_date_original.slice(0, 4));
  return raw.released_at ? new Date(raw.released_at * 1000).getUTCFullYear() : undefined;
};

const toAlbum = (raw: RawAlbum): QobuzAlbum => ({
  id: String(raw.id),
  title: raw.title,
  artist: raw.artist,
  upc: raw.upc,
  label: raw.label?.name,
  year: releaseYear(raw),
  tracksCount: raw.tracks_count,
  duration: raw.duration,
  hires: raw.hires,
  cover: raw.image?.large ?? raw.image?.small,
  tracks: (raw.tracks?.items ?? []).map(({ title, duration }) => ({ title, duration })),
});

const getAlbum = async (transport: Transport, albumId: string): Promise<QobuzAlbum> =>
  toAlbum(await transport.get<RawAlbum>("album/get", { album_id: albumId }));

const searchAlbums = async (transport: Transport, query: string): Promise<QobuzAlbum[]> => {
  const raw = await transport.get<{ albums?: { items?: RawAlbum[] } }>("catalog/search", {
    query,
    type: "albums",
    limit: 10,
  });
  return (raw.albums?.items ?? []).map(toAlbum);
};

export type LinkAlbum =
  | { ok: true; album: QobuzAlbum; approximate: boolean }
  | { ok: false; reason: "link"; failure: ResolveFailure }
  | { ok: false; reason: "no-match"; artist: string; title: string };

// A Qobuz album link is looked up directly; a Spotify or YouTube Music album is
// matched by its UPC (found through Deezer) first, then by title and artist.
export const resolveQobuzAlbum = async (transport: Transport, link: string): Promise<LinkAlbum> => {
  const outcome = await resolveAlbumLink(link);
  if (!outcome.ok) return { ok: false, reason: "link", failure: outcome.reason };

  if (outcome.direction === "from-qobuz") {
    return { ok: true, album: await getAlbum(transport, outcome.qobuzAlbumId), approximate: false };
  }

  const source = outcome.album;
  const [upc, candidates] = await Promise.all([
    findUpc(source).catch(() => undefined),
    searchAlbums(transport, `${source.artist} ${source.title}`),
  ]);
  const match = pickAlbumMatch(source, candidates, upc);
  if (!match) return { ok: false, reason: "no-match", artist: source.artist, title: source.title };

  // Search results carry no tracklist, so the match is fetched in full.
  return { ok: true, album: await getAlbum(transport, match.album.id), approximate: !match.exact };
};
