import type {
  Album,
  Artist,
  Library,
  PlaybackAction,
  Player,
  Queue,
  QueueIntent,
  RepeatMode,
  SearchPage,
  SearchRequest,
  Track,
} from "../domain/model";

/** All commands share this boundary. Implement live.ts behind it; do not add fetch to views. */
export interface MusicService {
  readonly mode: "demo" | "live";
  /** Stable server/user scope; exclude credentials. Demo must have a separate namespace. */
  getScope(): Promise<string>;
  getPlayers(): Promise<Player[]>;
  getQueues(): Promise<Queue[]>;
  search(request: SearchRequest, signal?: AbortSignal): Promise<SearchPage>;
  browse(item: Artist | Album): Promise<Library>;
  enqueue(playerId: string, track: Track, intent: QueueIntent): Promise<void>;
  playback(playerId: string, action: PlaybackAction): Promise<void>;
  setVolume(playerId: string, volume: number): Promise<void>;
  setMuted(playerId: string, muted: boolean): Promise<void>;
  setRepeat(playerId: string, repeat: RepeatMode): Promise<void>;
  setShuffle(playerId: string, shuffle: boolean): Promise<void>;
  removeQueueEntry(playerId: string, entryId: string): Promise<void>;
  dispose(): void;
}
export interface ActivePlayerStore {
  get(scope: string): Promise<string | undefined>;
  set(scope: string, playerId: string): Promise<void>;
}
