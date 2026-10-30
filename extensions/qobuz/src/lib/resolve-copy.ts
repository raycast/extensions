import { open } from "@raycast/api";
import type { Album, QobuzClient, Track } from "@kud/qobuz";
import { getClient } from "./client";
import { convertFromQobuz, convertToQobuz } from "./convert";
import { nowPlaying } from "./now-playing-track";
import { resolveLink, type ResolveFailure } from "./resolve";
import { shareLinks, type ShareLink } from "./share";
import { readNowPlayingTrackId } from "@kud/qobuz";

export type LinkTrack =
  | { ok: true; track: Track; album: Album | null; links: ShareLink[]; approximate: boolean }
  | { ok: false; reason: "link"; failure: ResolveFailure }
  | { ok: false; reason: "no-match"; artist: string; title: string };

export type CopyTrack = LinkTrack | { ok: false; reason: "nothing-playing" };

const searchUrl = (artist: string, title: string) =>
  `https://open.qobuz.com/search/${encodeURIComponent(`${artist} ${title}`)}`;

export const openQobuzSearch = (artist: string, title: string) => open(searchUrl(artist, title));

// A Qobuz track link is looked up directly; a Spotify or YouTube Music link is
// matched to its Qobuz track first. Either way, the result carries the share
// links for every other service.
export const resolveTrackLink = async (client: QobuzClient, link: string): Promise<LinkTrack> => {
  const outcome = await resolveLink(link);
  if (!outcome.ok) return { ok: false, reason: "link", failure: outcome.reason };

  if (outcome.direction === "from-qobuz") {
    const converted = await convertFromQobuz(client, outcome.qobuzTrackId);
    return { ok: true, track: converted.track, album: converted.album, links: converted.links, approximate: false };
  }

  const converted = await convertToQobuz(client, outcome.track);
  if (!converted.track) {
    return { ok: false, reason: "no-match", artist: outcome.track.artist, title: outcome.track.title };
  }
  const links = await shareLinks(converted.track);
  return { ok: true, track: converted.track, album: converted.album, links, approximate: !converted.exact };
};

// Order: the argument if given, else the current track. There is no
// clipboard fallback.
export const resolveCopyTrack = async (argument: string): Promise<CopyTrack> => {
  const client = await getClient();
  const link = argument.trim();

  if (link) return resolveTrackLink(client, link);

  const nowPlayingId = await readNowPlayingTrackId();
  if (nowPlayingId !== undefined) {
    const converted = await convertFromQobuz(client, nowPlayingId);
    return { ok: true, track: converted.track, album: converted.album, links: converted.links, approximate: false };
  }

  const track = await nowPlaying(client);
  if (!track) return { ok: false, reason: "nothing-playing" };
  const links = await shareLinks(track);
  return { ok: true, track, album: null, links, approximate: false };
};

// Album, playlist, artist or invalid links reuse the convert view's wording.
export const linkFailureTitle = (failure: ResolveFailure): string =>
  failure === "unsupported-type" ? "Need a track link" : "Unsupported link";

export const noMatchTitle = (artist: string, title: string): string => `No Qobuz match for ${artist} – ${title}`;
