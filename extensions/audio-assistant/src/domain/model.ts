/** UI-owned models. Decode server responses at the adapter boundary, never in React. */
export type View = "all" | "players" | "tracks" | "artists" | "albums";
export type RepeatMode = "off" | "one" | "all";
export type PlaybackAction = "play-pause" | "next" | "previous";
export type QueueIntent = "play-now" | "play-next" | "add";
export interface MediaRef {
  uri: string;
  provider: string;
  itemId: string;
}
interface MediaBase extends MediaRef {
  name: string;
  artwork?: string;
}
export interface Track extends MediaBase {
  kind: "track";
  artist: string;
  artistUris: string[];
  albumUri?: string;
  album: string;
  duration: number;
}
export interface Artist extends MediaBase {
  kind: "artist";
}
export interface Album extends MediaBase {
  kind: "album";
  artist: string;
  artistUris: string[];
}
export interface Player {
  kind: "player";
  id: string;
  name: string;
  available: boolean;
  provider: string;
  playerType: string;
  state: "idle" | "playing" | "paused";
  volume?: number;
  muted?: boolean;
  /** Resolved server queue identity. Never assume every player's id is its active queue. */
  queueId?: string;
  activeSource?: string;
  activeGroupId?: string;
  groupLeaderId?: string;
  groupMemberIds: string[];
  capabilities: { volume: boolean; mute: boolean; grouping: boolean };
}
export interface QueueEntry {
  /** Queue entry identity, NOT track URI: duplicates are legal. */
  id: string;
  track: Track;
}
export interface Queue {
  id: string;
  active: boolean;
  entries: QueueEntry[];
  currentIndex: number | null;
  repeat: RepeatMode;
  shuffle: boolean;
}
export type Item = Player | Track | Artist | Album;
export interface Library {
  players: Player[];
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
}
export interface SearchRequest {
  query: string;
  view: View;
  /** Adapter-owned opaque paging cursor. */
  cursor?: string;
  limit: number;
}
export interface SearchPage {
  items: Item[];
  nextCursor?: string;
}
