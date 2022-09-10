import { Grid } from "@raycast/api";

export enum PlayerState {
  PLAYING = "playing",
  PAUSED = "paused",
  STOPPED = "stopped",
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  artwork?: string;
  duration?: string;
  state?: PlayerState;
  time?: string;
  playCount?: number;
  loved?: boolean;
  rating?: number;
  year?: string;
}

export enum PlaylistKind {
  ALL = "all",
  USER = "user",
  SUBSCRIPTION = "subscription",
}

export interface Playlist {
  id: string;
  name: string;
  duration: string;
  count: string;
  time: string;
  kind: string | `${PlaylistKind} playlist`;
  artwork?: string;
  tracks?: Track[];
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  genre: string;
  tracks: Track[];
  artwork?: string;
  count?: number;
}

export interface MusicState {
  title: string;
  playing: boolean;
  repeat: string;
  shuffle: boolean;
  loved: boolean;
  added: boolean;
  rating: number;
}

export interface Preferences {
  layoutType: "list" | "grid";
  gridItemSize: Grid.ItemSize;
  albumTracksLayout: "list" | "grid";
  playlistTracksLayout: "list" | "grid";
}
