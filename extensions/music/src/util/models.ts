export enum PlayerState {
  PLAYING = "playing",
  PAUSED = "paused",
  STOPPED = "stopped",
}

export interface Track {
  id?: string;
  name: string;
  artist: string;
  album: string;
  duration: string;
  favorited?: string;
  state?: PlayerState;
}

export type MenuBarSnapshot =
  | { kind: "not-running" }
  | { kind: "no-track"; playerState: PlayerState }
  | { kind: "ok"; track: Readonly<Track>; playerState: PlayerState };

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

export interface Preferences {
  volumeSteps: string;
  disableHUD: boolean;
}
