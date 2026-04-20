export interface Status {
  state: "playing" | "paused" | "stopped";
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  elapsed: number;
  volume: number;
  progress: number;
  bit_depth?: number;
  sample_rate?: number;
  codec?: string;
  shuffle: boolean;
  repeat: "off" | "one" | "all";
  authenticated: boolean;
  queue: Track[];
  queue_index?: number;
}

export interface Track {
  id: number;
  title: string;
  duration: number;
  track_number?: number;
  artists: Artist[];
  album: Album;
  audio_quality?: string;
  explicit?: boolean;
}

export interface Artist {
  id: number;
  name: string;
}

export interface Album {
  id: number;
  title: string;
}

export interface FavAlbum {
  id: number;
  title: string;
  numberOfTracks: number;
  duration: number;
  artists: Artist[];
  coverUrl?: string;
}

export interface Playlist {
  uuid: string;
  title: string;
  numberOfTracks: number;
  duration: number;
  playlistType: string;
  publicPlaylist?: boolean;
}

export interface Mix {
  id: string;
  title: string;
  subTitle?: string;
}

export interface Library {
  playlists: Playlist[];
  mixes: Mix[];
}

export interface QueueResponse {
  tracks: Track[];
  current_index?: number;
}

export interface PlayTrackRequest {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
}
