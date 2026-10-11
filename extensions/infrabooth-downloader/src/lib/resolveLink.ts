import type { PlaylistInfo, TrackInfo } from "../shared/bindings";
import type { RemoteTrack } from "../shared/remote-protocol";
import type { LibraryPlaylist } from "./mapping";
import { mapTrack } from "../shared/trackMapping";

export type ResolvedLinkJson = { kind: "track"; track: TrackInfo } | { kind: "playlist"; playlist: PlaylistInfo };

export interface ResolvedPlaylist {
  id: number;
  ownerId: number;
  title: string;
  owner: string;
  artworkUrl: string | null;
  trackCount: number;
  tracks: TrackInfo[];
  secretToken: string | null;
}

export type ResolvedLink =
  | { kind: "track"; track: RemoteTrack; secretToken: string | null; downloadUrl: string | null }
  | { kind: "playlist"; playlist: ResolvedPlaylist };

export function mapResolvedLink(json: ResolvedLinkJson): ResolvedLink {
  if (json.kind === "track") {
    return {
      kind: "track",
      track: mapTrack(json.track),
      secretToken: json.track.secret_token ?? null,
      downloadUrl: json.track.download_url ?? null,
    };
  }
  const { playlist } = json;
  return {
    kind: "playlist",
    playlist: {
      id: playlist.id,
      ownerId: playlist.user.id,
      title: playlist.title,
      owner: playlist.user.username,
      artworkUrl: playlist.artwork_url,
      trackCount: playlist.track_count,
      tracks: playlist.tracks,
      secretToken: playlist.secret_token ?? null,
    },
  };
}

export function resolvedTitle(link: ResolvedLink): string {
  return link.kind === "track" ? link.track.title : link.playlist.title;
}

function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function toLibraryPlaylist(playlist: ResolvedPlaylist, link: string): LibraryPlaylist {
  return {
    id: playlist.id,
    title: playlist.title,
    username: playlist.owner,
    userId: playlist.ownerId,
    artworkUrl: playlist.artworkUrl,
    trackCount: playlist.trackCount,
    duration: playlist.tracks.reduce((total, track) => total + track.duration, 0),
    permalinkUrl: withScheme(link),
    isOwned: false,
    isPublic: playlist.secretToken === null,
    secretToken: playlist.secretToken,
  };
}

const SYSTEM_PLAYLIST_ID = 0;

export function systemPlaylistTracks(playlist: ResolvedPlaylist): RemoteTrack[] | undefined {
  return playlist.id === SYSTEM_PLAYLIST_ID ? playlist.tracks.map(mapTrack) : undefined;
}
