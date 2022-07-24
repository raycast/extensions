export enum SpotifyPlayingState {
  Playing = "playing",
  Paused = "paused",
  Stopped = "stopped",
}

export interface SpotifyState {
  volume: number;
  position: number;
  state: SpotifyPlayingState;
}

export interface TrackInfo {
  artist: string;
  album: string;
  album_artist: string;
  artwork_url: string;
  disc_number: number;
  duration: number;
  id: string;
  name: string;
  played_count: number;
  popularity: number;
  spotify_url: string;
  starred: boolean;
  track_number: number;
}
