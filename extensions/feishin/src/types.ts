export type PlayerStatus = "playing" | "paused";
export type PlayerRepeat = "none" | "one" | "all";

export interface RelatedArtist {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface QueueSong {
  id: string;
  _serverId: string;
  name: string;
  artistName: string;
  artists: RelatedArtist[];
  albumArtistName: string;
  album: string | null;
  albumId: string;
  duration: number;
  imageId: string | null;
  imageUrl: string | null;
  userFavorite: boolean;
  userRating: number | null;
  trackNumber: number;
  discNumber: number;
}

export interface SongState {
  song?: QueueSong | null;
  status?: PlayerStatus;
  volume?: number;
  repeat?: PlayerRepeat;
  shuffle?: boolean;
  position?: number;
}

export interface ClientAuth {
  event: "authenticate";
  header: string;
}
export interface ClientFavorite {
  event: "favorite";
  favorite: boolean;
  id: string;
}
export interface ClientPosition {
  event: "position";
  position: number;
}
export interface ClientRating {
  event: "rating";
  id: string;
  rating: number;
}
export interface ClientSimpleEvent {
  event:
    | "next"
    | "pause"
    | "play"
    | "previous"
    | "proxy"
    | "repeat"
    | "shuffle";
}
export interface ClientVolume {
  event: "volume";
  volume: number;
}
export type ClientEvent =
  | ClientAuth
  | ClientFavorite
  | ClientPosition
  | ClientRating
  | ClientSimpleEvent
  | ClientVolume;

export interface ServerState {
  event: "state";
  data: SongState;
}
export interface ServerSong {
  event: "song";
  data: QueueSong | null;
}
export interface ServerPlayStatus {
  event: "playback";
  data: PlayerStatus;
}
export interface ServerVolume {
  event: "volume";
  data: number;
}
export interface ServerRepeat {
  event: "repeat";
  data: PlayerRepeat;
}
export interface ServerShuffle {
  event: "shuffle";
  data: boolean;
}
export interface ServerPosition {
  event: "position";
  data: number;
}
export interface ServerFavorite {
  event: "favorite";
  data: { id: string; favorite: boolean };
}
export interface ServerRating {
  event: "rating";
  data: { id: string; rating: number };
}
export interface ServerProxy {
  event: "proxy";
  data: string;
}
export interface ServerError {
  event: "error";
  data: string;
}
export type ServerEvent =
  | ServerState
  | ServerSong
  | ServerPlayStatus
  | ServerVolume
  | ServerRepeat
  | ServerShuffle
  | ServerPosition
  | ServerFavorite
  | ServerRating
  | ServerProxy
  | ServerError;

export interface Preferences {
  host: string;
  port: string;
  username: string;
  password: string;
  navidromeUrl: string;
  navidromeUsername: string;
  navidromePassword: string;
}
