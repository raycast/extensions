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

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number | null;
  /** Artwork URL template containing {w}/{h} placeholders — render with artworkUrl(). */
  artwork: string | null;
  /** music.apple.com page for the song — opens Music.app. */
  url: string | null;
  contentRating: "clean" | "explicit" | null;
  /** Without playParams the catalog entry is a listed husk — visible but not
   * playable/addable. Gate add actions on this. */
  playable: boolean;
}

export interface CatalogAlbum {
  id: string;
  title: string;
  artist: string;
  trackCount: number;
  releaseDate: string | null;
  artwork: string | null;
  url: string | null;
  contentRating: "clean" | "explicit" | null;
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
