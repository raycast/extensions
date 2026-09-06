import { randomUUID } from "node:crypto";
import type { Album, Artist, PlaybackAction, QueueIntent, RepeatMode, SearchRequest, Track } from "../domain/model";
import { AudioAssistantError, clampVolume, requirePlayer, requireQueue, searchLibrary } from "../domain/policy";
import { demoData } from "./demo-data";
import type { MusicService } from "./port";

/** Deterministic in-memory preview. No network, audio output, or persisted queue simulation. */
export class DemoMusicService implements MusicService {
  readonly mode = "demo";
  async getScope() {
    return "demo:v1";
  }
  private readonly data = demoData();
  async getPlayers() {
    return structuredClone(this.data.library.players);
  }
  async getQueues() {
    return structuredClone(this.data.queues);
  }
  async search(request: SearchRequest, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const all = searchLibrary(this.data.library, request.view, request.query);
    const start = Number(request.cursor ?? 0);
    const end = start + request.limit;
    return { items: structuredClone(all.slice(start, end)), nextCursor: end < all.length ? String(end) : undefined };
  }
  async browse(item: Artist | Album) {
    const { library } = this.data;
    return structuredClone({
      players: [],
      artists: [],
      albums: item.kind === "artist" ? library.albums.filter((a) => a.artistUris.includes(item.uri)) : [],
      tracks: library.tracks.filter((t) =>
        item.kind === "artist" ? t.artistUris.includes(item.uri) : t.albumUri === item.uri,
      ),
    });
  }
  private player(id: string) {
    return requirePlayer(this.data.library.players, id);
  }
  private queue(id: string) {
    return requireQueue(this.player(id), this.data.queues);
  }
  async enqueue(id: string, track: Track, intent: QueueIntent) {
    const queue = this.queue(id);
    const entry = { id: randomUUID(), track: structuredClone(track) };
    // Explicit contract: instant play preserves existing queue, inserts after current, then jumps.
    if (intent === "add") queue.entries.push(entry);
    else {
      const index = queue.currentIndex === null ? 0 : queue.currentIndex + 1;
      queue.entries.splice(index, 0, entry);
      if (intent === "play-now") {
        queue.currentIndex = index;
        this.player(id).state = "playing";
      }
    }
  }
  async playback(id: string, action: PlaybackAction) {
    const queue = this.queue(id);
    if (!queue.entries.length) throw new AudioAssistantError("unsupported", "The queue is empty. Play a track first.");
    const player = this.player(id);
    if (action === "play-pause") {
      queue.currentIndex ??= 0;
      player.state = player.state === "playing" ? "paused" : "playing";
    } else {
      const current = queue.currentIndex ?? -1;
      const next = current + (action === "next" ? 1 : -1);
      queue.currentIndex =
        queue.repeat === "all"
          ? (next + queue.entries.length) % queue.entries.length
          : Math.max(0, Math.min(queue.entries.length - 1, next));
      player.state = "playing";
    }
  }
  async setVolume(id: string, volume: number) {
    const player = this.player(id);
    if (!player.capabilities.volume)
      throw new AudioAssistantError("unsupported", "This player does not support volume control.");
    player.volume = clampVolume(volume);
  }
  async setMuted(id: string, muted: boolean) {
    const player = this.player(id);
    if (!player.capabilities.mute) throw new AudioAssistantError("unsupported", "This player does not support mute.");
    player.muted = muted;
  }
  async setRepeat(id: string, repeat: RepeatMode) {
    this.queue(id).repeat = repeat;
  }
  async setShuffle(id: string, shuffle: boolean) {
    this.queue(id).shuffle = shuffle;
  }
  async removeQueueEntry(id: string, entryId: string) {
    const queue = this.queue(id);
    const index = queue.entries.findIndex((entry) => entry.id === entryId);
    if (index < 0) throw new Error("This queue entry no longer exists.");
    if (queue.currentIndex === index) throw new Error("Skip the current track before removing it.");
    queue.entries.splice(index, 1);
    if (queue.currentIndex !== null && index < queue.currentIndex) queue.currentIndex -= 1;
  }
  dispose() {
    /* No resources in demo mode. */
  }
}
