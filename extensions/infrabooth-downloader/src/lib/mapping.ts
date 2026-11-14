import type { RemoteTrack } from "../shared/remote-protocol";
import { mapTrack, type TrackInfoJson } from "../shared/trackMapping";

export interface LibraryPlaylist {
  id: number;
  title: string;
  username: string;
  userId: number | null;
  artworkUrl: string | null;
  trackCount: number;
  duration: number;
  permalinkUrl: string;
  isOwned: boolean;
  isPublic: boolean;
  secretToken: string | null;
}

export interface LibraryPlaylistJson {
  id: number;
  title: string;
  username: string;
  user_id: number | null;
  artwork_url: string | null;
  track_count: number;
  duration: number;
  permalink_url: string;
  is_owned: boolean;
  is_public: boolean;
  secret_token: string | null;
}

export function mapPlaylist(p: LibraryPlaylistJson): LibraryPlaylist {
  return {
    id: p.id,
    title: p.title,
    username: p.username,
    userId: p.user_id,
    artworkUrl: p.artwork_url,
    trackCount: p.track_count,
    duration: p.duration,
    permalinkUrl: p.permalink_url,
    isOwned: p.is_owned,
    isPublic: p.is_public,
    secretToken: p.secret_token,
  };
}

export interface Mix {
  id: string;
  title: string;
  artworkUrl: string | null;
  tracks: RemoteTrack[];
}

export interface SelectionJson {
  id: string;
  title: string;
  shortTitle: string;
  artworkUrl: string | null;
  trackCount: number;
  tracks: TrackInfoJson[];
}

export function mapMix(selection: SelectionJson): Mix {
  return {
    id: selection.id,
    title: selection.title,
    artworkUrl: selection.artworkUrl,
    tracks: selection.tracks.map(mapTrack),
  };
}
