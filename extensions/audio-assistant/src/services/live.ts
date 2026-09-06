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
  View,
} from "../domain/model";
import { AudioAssistantError, clampVolume, requirePlayer } from "../domain/policy";
import { normalizeServerUrl } from "./http-client";
import type { MusicService } from "./port";
import {
  decodeAlbum,
  decodeArray,
  decodeArtist,
  decodeConnectionIdentity,
  decodePlayer,
  decodeQueueEntry,
  decodeQueueSummary,
  decodeSearchResults,
  decodeTrack,
  resolveEffectiveQueues,
  visiblePlayers,
  type ConnectionIdentity,
  type QueueSummary,
} from "./wire";

export interface CommandClient {
  command(command: string, args?: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
}

interface LiveOptions {
  serverUrl: string;
  client: CommandClient;
}

type LibraryKind = "tracks" | "artists" | "albums";

export class LiveMusicService implements MusicService {
  readonly mode = "live";
  readonly serverUrl: string;
  private identity?: ConnectionIdentity;
  private identityRequest?: Promise<ConnectionIdentity>;

  constructor(private readonly options: LiveOptions) {
    this.serverUrl = normalizeServerUrl(options.serverUrl);
  }

  private async getIdentity(): Promise<ConnectionIdentity> {
    if (this.identity) return this.identity;
    if (!this.identityRequest) {
      this.identityRequest = Promise.all([this.options.client.command("info"), this.options.client.command("auth/me")])
        .then(([server, user]) => decodeConnectionIdentity(server, user))
        .then((identity) => (this.identity = identity))
        .catch((error) => {
          this.identityRequest = undefined;
          throw error;
        });
    }
    return this.identityRequest;
  }

  async getScope(): Promise<string> {
    const identity = await this.getIdentity();
    return `live:${identity.serverId}:${identity.userId}`;
  }

  private async context(signal?: AbortSignal): Promise<{ players: Player[]; queueSummaries: QueueSummary[] }> {
    const [playerValue, queueValue] = await Promise.all([
      this.options.client.command("players/all", { return_unavailable: true }, signal),
      this.options.client.command("player_queues/all", {}, signal),
    ]);
    const decodedPlayers = visiblePlayers(decodeArray(playerValue, "players", decodePlayer));
    const queueSummaries = decodeArray(queueValue, "queues", decodeQueueSummary);
    return { players: resolveEffectiveQueues(decodedPlayers, queueSummaries), queueSummaries };
  }

  async getPlayers(): Promise<Player[]> {
    return (await this.context()).players;
  }

  async getQueues(): Promise<Queue[]> {
    const queueValue = await this.options.client.command("player_queues/all");
    const summaries = decodeArray(queueValue, "queues", decodeQueueSummary);
    return Promise.all(
      summaries.map(async (summary) => {
        const itemValue = await this.options.client.command("player_queues/items", {
          queue_id: summary.id,
          limit: 200,
          offset: 0,
        });
        return {
          id: summary.id,
          active: summary.active,
          entries: decodeArray(itemValue, `queueItems.${summary.id}`, (item, path) =>
            decodeQueueEntry(item, path, this.serverUrl),
          ),
          currentIndex: summary.currentIndex,
          repeat: summary.repeat,
          shuffle: summary.shuffle,
        };
      }),
    );
  }

  private async library(kind: LibraryKind, request: SearchRequest, signal?: AbortSignal) {
    const offset = Number.parseInt(request.cursor ?? "0", 10);
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const value = await this.options.client.command(
      `music/${kind}/library_items`,
      { limit: request.limit, offset: safeOffset, search: request.query || undefined },
      signal,
    );
    const decoder = (item: unknown, path: string): Track | Artist | Album =>
      kind === "tracks"
        ? decodeTrack(item, path, this.serverUrl)
        : kind === "artists"
          ? decodeArtist(item, path, this.serverUrl)
          : decodeAlbum(item, path, this.serverUrl);
    const items = decodeArray(value, kind, decoder);
    return { items, nextCursor: items.length === request.limit ? String(safeOffset + items.length) : undefined };
  }

  private mediaTypes(view: View): string[] {
    if (view === "tracks") return ["track"];
    if (view === "artists") return ["artist"];
    if (view === "albums") return ["album"];
    return ["artist", "track", "album"];
  }

  async search(request: SearchRequest, signal?: AbortSignal): Promise<SearchPage> {
    if (request.view === "players") {
      const words = request.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const players = (await this.getPlayers()).filter((player) =>
        words.every((word) => `${player.name} ${player.provider}`.toLocaleLowerCase().includes(word)),
      );
      const offset = Math.max(0, Number.parseInt(request.cursor ?? "0", 10) || 0);
      const items = players.slice(offset, offset + request.limit);
      return { items, nextCursor: offset + items.length < players.length ? String(offset + items.length) : undefined };
    }

    if (!request.query) {
      if (request.view === "tracks") return this.library("tracks", request, signal);
      if (request.view === "artists") return this.library("artists", request, signal);
      if (request.view === "albums") return this.library("albums", request, signal);
      const artistRequest = { ...request, view: "artists" as const, limit: Math.min(5, request.limit) };
      const [players, artists, tracks, albums] = await Promise.all([
        this.getPlayers(),
        this.library("artists", artistRequest, signal),
        this.library("tracks", { ...request, view: "tracks", limit: Math.min(50, request.limit) }, signal),
        this.library("albums", { ...request, view: "albums", limit: Math.min(25, request.limit) }, signal),
      ]);
      return { items: [...players, ...artists.items, ...tracks.items, ...albums.items] };
    }

    const [players, searchValue] = await Promise.all([
      request.view === "all" ? this.getPlayers() : Promise.resolve([]),
      this.options.client.command(
        "music/search",
        { search_query: request.query, media_types: this.mediaTypes(request.view), limit: request.limit },
        signal,
      ),
    ]);
    const results = decodeSearchResults(searchValue, this.serverUrl);
    const matchingPlayers = players.filter((player) =>
      `${player.name} ${player.provider}`.toLocaleLowerCase().includes(request.query.toLocaleLowerCase()),
    );
    if (request.view === "tracks") return { items: results.tracks };
    if (request.view === "artists") return { items: results.artists };
    if (request.view === "albums") return { items: results.albums };
    return { items: [...matchingPlayers, ...results.artists, ...results.tracks, ...results.albums] };
  }

  async browse(item: Artist | Album): Promise<Library> {
    if (item.kind === "artist") {
      const args = { item_id: item.itemId, provider_instance_id_or_domain: item.provider };
      const [trackValue, albumValue] = await Promise.all([
        this.options.client.command("music/artists/artist_tracks", args),
        this.options.client.command("music/artists/artist_albums", args),
      ]);
      return {
        players: [],
        artists: [],
        tracks: decodeArray(trackValue, "artistTracks", (item, path) => decodeTrack(item, path, this.serverUrl)),
        albums: decodeArray(albumValue, "artistAlbums", (item, path) => decodeAlbum(item, path, this.serverUrl)),
      };
    }
    const value = await this.options.client.command("music/albums/album_tracks", {
      item_id: item.itemId,
      provider_instance_id_or_domain: item.provider,
      in_library_only: false,
    });
    return {
      players: [],
      artists: [],
      albums: [],
      tracks: decodeArray(value, "albumTracks", (track, path) => decodeTrack(track, path, this.serverUrl)),
    };
  }

  private async target(playerId: string, requireActiveQueue: boolean) {
    const { players } = await this.context();
    const player = requirePlayer(players, playerId);
    if (requireActiveQueue && !player.queueId) {
      throw new AudioAssistantError(
        "unsupported",
        `${player.name} is using a source without a controllable Music Assistant queue.`,
      );
    }
    return player;
  }

  async enqueue(playerId: string, track: Track, intent: QueueIntent): Promise<void> {
    const player = await this.target(playerId, true);
    const option = intent === "play-now" ? "play" : intent === "play-next" ? "next" : "add";
    await this.options.client.command("player_queues/play_media", {
      queue_id: player.queueId,
      media: track.uri,
      option,
    });
  }

  async playback(playerId: string, action: PlaybackAction): Promise<void> {
    const player = await this.target(playerId, false);
    const command = action === "play-pause" ? "play_pause" : action;
    await this.options.client.command(`players/cmd/${command}`, { player_id: player.id });
  }

  async setVolume(playerId: string, volume: number): Promise<void> {
    const player = await this.target(playerId, false);
    if (!player.capabilities.volume)
      throw new AudioAssistantError("unsupported", `${player.name} does not support volume control.`);
    await this.options.client.command("players/cmd/volume_set", {
      player_id: player.id,
      volume_level: clampVolume(volume),
    });
  }

  async setMuted(playerId: string, muted: boolean): Promise<void> {
    const player = await this.target(playerId, false);
    if (!player.capabilities.mute)
      throw new AudioAssistantError("unsupported", `${player.name} does not support mute control.`);
    await this.options.client.command("players/cmd/volume_mute", { player_id: player.id, muted });
  }

  async setRepeat(playerId: string, repeat: RepeatMode): Promise<void> {
    const player = await this.target(playerId, true);
    await this.options.client.command("player_queues/repeat", { queue_id: player.queueId, repeat_mode: repeat });
  }

  async setShuffle(playerId: string, shuffle: boolean): Promise<void> {
    const player = await this.target(playerId, true);
    await this.options.client.command("player_queues/shuffle", {
      queue_id: player.queueId,
      shuffle_enabled: shuffle,
    });
  }

  async removeQueueEntry(playerId: string, entryId: string): Promise<void> {
    const player = await this.target(playerId, true);
    await this.options.client.command("player_queues/delete_item", {
      queue_id: player.queueId,
      item_id_or_index: entryId,
    });
  }

  dispose() {
    // HTTP commands own no long-lived resources. M3 will close event subscriptions here.
  }
}
