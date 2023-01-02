export enum PlayerState {
  PLAYING = "playing",
  PAUSED = "paused",
  STOPPED = "stopped",
}

export enum SFSymbols {
  WARNING = "􀁟",
  ADD_TO_LIBRARY = "􀈄",
  DISLIKE = "􀊂",
  LOVE = "􀊵",
  TRACK_NEXT = "􀊌",
  TRACK_PREVIOUS = "􀊊",
  PLAY = "􀊃",
  PLAY_FILL = "􀊄",
  PAUSE = "􀊆",
  PLAYPAUSE = "􀊈",
  SHUFFLE = "􀊝",
  ARTIST = "􀑫",
  PLAYLIST = "􀑬",
  MUSIC_NOTE = "􀑪",
  STAR = "􀋂",
  STAR_FILL = "􀋃",
  TIME = "􀐫",
}

export interface Track {
  id?: string;
  name: string;
  artist: string;
  album: string;
  duration: string;
  state?: PlayerState;
}

export interface Playlist {
  id: string;
  name: string;
  duration: string;
  count: string;

  time: string;
  description: string;
  kind: `${"subscription" | "user" | "library"} playlist`;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  count?: string;
}

export interface ScriptError extends Error {
  shortMessage: string;
  command: string;
  failed: boolean;
}

export const ScriptError = {
  is: (error: Error): error is ScriptError => "shortMessaage" in error,
};
