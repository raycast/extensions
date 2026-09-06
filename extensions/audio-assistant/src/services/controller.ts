import type { PlaybackAction, Player, QueueIntent, Track } from "../domain/model";
import { requirePlayer } from "../domain/policy";
import type { ActivePlayerStore, MusicService } from "./port";

/** Persisted default = active target. Highlighting rows alone never changes it. */
export class PlaybackController {
  constructor(
    readonly service: MusicService,
    private readonly storage: ActivePlayerStore,
  ) {}
  async active(): Promise<Player> {
    const [players, scope] = await Promise.all([this.service.getPlayers(), this.service.getScope()]);
    return requirePlayer(players, await this.storage.get(scope));
  }
  async select(id: string): Promise<void> {
    requirePlayer(await this.service.getPlayers(), id);
    await this.storage.set(await this.service.getScope(), id);
  }
  async enqueue(track: Track, intent: QueueIntent): Promise<void> {
    await this.service.enqueue((await this.active()).id, track, intent);
  }
  async playback(action: PlaybackAction): Promise<void> {
    await this.service.playback((await this.active()).id, action);
  }
}
