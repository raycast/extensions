import type { Album, QobuzClient, Track } from "@kud/qobuz";
import { findIsrc, isLikelyMatch, type ResolvedTrack } from "./resolve";
import { shareLinks, type ShareLink } from "./share";

export type FromQobuzResult = {
  mode: "from-qobuz";
  track: Track;
  album: Album | null;
  links: ShareLink[];
};

export type ToQobuzResult = {
  mode: "to-qobuz";
  resolved: ResolvedTrack;
  track: Track | null;
  album: Album | null;
  exact: boolean;
};

// Reverse: a Qobuz track → links on the other services.
export const convertFromQobuz = async (client: QobuzClient, trackId: number): Promise<FromQobuzResult> => {
  const track = await client.tracks.get(trackId);
  const album = track.album?.id ? ((await client.albums.get(track.album.id).catch(() => undefined)) ?? null) : null;
  const links = await shareLinks(track);
  return { mode: "from-qobuz", track, album, links };
};

// Forward: a foreign track → the matching Qobuz track.
export const convertToQobuz = async (client: QobuzClient, resolved: ResolvedTrack): Promise<ToQobuzResult> => {
  const query = `${resolved.artist} ${resolved.title}`;
  const isrc = await findIsrc(resolved);

  let track = isrc ? ((await client.tracks.match({ isrc, query })) ?? null) : null;
  const exact = Boolean(track);

  if (!track) {
    // Approximate fallback: only trust a candidate that actually resembles
    // the source, so a track absent from Qobuz reports "no match" rather
    // than a confident wrong result.
    const candidates = (await client.search.search(query, { limit: 5 })).tracks;
    track = candidates.find((c) => isLikelyMatch(resolved, c)) ?? null;
  }

  const album = track?.album?.id ? ((await client.albums.get(track.album.id).catch(() => undefined)) ?? null) : null;

  return { mode: "to-qobuz", resolved, track, album, exact };
};
