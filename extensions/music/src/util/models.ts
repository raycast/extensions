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
  dateAdded: number;
  playedCount: number;
  duration: number;
  artwork?: string;
  time?: string;
  inLibrary?: boolean;
  loved?: boolean;
  rating?: number;
  year?: string;
}

export enum PlaylistKind {
  ALL = "all",
  USER = "user playlist",
  LIBRARY = "library playlist",
  SUBSCRIPTION = "subscription playlist",
}

export interface Playlist {
  id: string;
  name: string;
  duration: string;
  count: string;
  time: string;
  kind: PlaylistKind;
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

export enum TrackDropdownOption {
  SortBy = "sort",
  Genre = "genre",
}

export interface Preferences {
  apiKey: string;
  gridItemSize: Grid.ItemSize;
  layoutType: "list" | "grid";
  albumTracksLayout: "list" | "grid";
  playlistTracksLayout: "list" | "grid";
  trackDropdown: TrackDropdownOption;
}

export interface ScriptError extends Error {
  shortMessage: string;
  command: string;
  failed: boolean;
}

export const ScriptError = {
  is: (error: Error): error is ScriptError => "shortMessaage" in error,
};
