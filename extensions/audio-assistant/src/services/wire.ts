import type { Album, Artist, Player, Queue, QueueEntry, Track } from "../domain/model";

export class WireError extends Error {
  constructor(path: string, expected: string) {
    super(`Music Assistant returned invalid data at ${path}; expected ${expected}.`);
    this.name = "WireError";
  }
}

type RecordValue = Record<string, unknown>;

function record(value: unknown, path: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new WireError(path, "an object");
  return value as RecordValue;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new WireError(path, "an array");
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new WireError(path, "a non-empty string");
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function boolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function playbackState(value: unknown): Player["state"] {
  return value === "playing" || value === "paused" ? value : "idle";
}

function repeatMode(value: unknown): Queue["repeat"] {
  return value === "one" || value === "all" ? value : "off";
}

/** Reject ignored/unsupported favorite filters rather than displaying non-favorites. */
export function requireFavorite(value: unknown, path: string): void {
  if (record(value, path).favorite !== true) throw new WireError(`${path}.favorite`, "a confirmed favorite (true)");
}

function mediaIdentity(value: RecordValue, path: string) {
  return {
    ...(typeof value.favorite === "boolean" ? { favorite: value.favorite } : {}),
    itemId: string(value.item_id, `${path}.item_id`),
    provider: string(value.provider, `${path}.provider`),
    uri: string(value.uri, `${path}.uri`),
    name: string(value.name, `${path}.name`),
  };
}

function mappingName(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return optionalString((value as RecordValue).name);
}

function mappingUri(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return optionalString((value as RecordValue).uri);
}

function primaryImage(value: RecordValue, serverUrl?: string): string | undefined {
  const metadata = value.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const images = (metadata as RecordValue).images;
  if (!Array.isArray(images)) return undefined;
  for (const image of images) {
    if (!image || typeof image !== "object" || Array.isArray(image)) continue;
    const imageRecord = image as RecordValue;
    if (imageRecord.type !== "thumb") continue;
    const path = optionalString(imageRecord.path);
    if (boolean(imageRecord.remotely_accessible) && path && /^https?:\/\//i.test(path)) return path;
    const proxyId = optionalString(imageRecord.proxy_id);
    if (serverUrl && proxyId)
      return `${serverUrl.replace(/\/+$/, "")}/imageproxy/${encodeURIComponent(proxyId)}?size=512`;
  }
  return undefined;
}

export function decodeTrack(value: unknown, path = "track", serverUrl?: string): Track {
  const item = record(value, path);
  const identity = mediaIdentity(item, path);
  const artistValues = Array.isArray(item.artists) ? item.artists : [];
  const artistNames = artistValues.map(mappingName).filter((name): name is string => Boolean(name));
  const artistUris = artistValues.map(mappingUri).filter((uri): uri is string => Boolean(uri));
  const albumValue = item.album;
  return {
    kind: "track",
    ...identity,
    artist: artistNames.join(", ") || "Unknown Artist",
    artistUris,
    artists: artistValues.flatMap((artist, index) => {
      try {
        return [decodeArtist(artist, `${path}.artists.${index}`, serverUrl)];
      } catch {
        return [];
      }
    }),
    albumItem: (() => {
      if (!albumValue) return undefined;
      try {
        return decodeAlbum(albumValue, `${path}.album`, serverUrl);
      } catch {
        return undefined;
      }
    })(),
    album: mappingName(albumValue) ?? "Unknown Album",
    albumUri: mappingUri(albumValue),
    duration: optionalNumber(item.duration) ?? 0,
    discNumber: optionalNumber(item.disc_number),
    trackNumber: optionalNumber(item.track_number),
    artwork: primaryImage(item, serverUrl),
  };
}

export function decodeArtist(value: unknown, path = "artist", serverUrl?: string): Artist {
  const item = record(value, path);
  return { kind: "artist", ...mediaIdentity(item, path), artwork: primaryImage(item, serverUrl) };
}

export function decodeAlbum(value: unknown, path = "album", serverUrl?: string): Album {
  const item = record(value, path);
  const artistValues = Array.isArray(item.artists) ? item.artists : [];
  const artistNames = artistValues.map(mappingName).filter((name): name is string => Boolean(name));
  const artistUris = artistValues.map(mappingUri).filter((uri): uri is string => Boolean(uri));
  return {
    kind: "album",
    ...mediaIdentity(item, path),
    artist: artistNames.join(", ") || "Unknown Artist",
    artistUris,
    artwork: primaryImage(item, serverUrl),
  };
}

export interface DecodedPlayer extends Player {
  canGroupWith: string[];
  hidden: boolean;
  private: boolean;
}

export function decodePlayer(value: unknown, path = "player"): DecodedPlayer {
  const item = record(value, path);
  const features = new Set(strings(item.supported_features));
  const volume = optionalNumber(item.volume_level) ?? optionalNumber(item.group_volume);
  const muted =
    typeof item.volume_muted === "boolean"
      ? item.volume_muted
      : typeof item.group_volume_muted === "boolean"
        ? item.group_volume_muted
        : undefined;
  return {
    kind: "player",
    id: string(item.player_id, `${path}.player_id`),
    name: string(item.name ?? item.display_name, `${path}.name`),
    provider: string(item.provider, `${path}.provider`),
    playerType: optionalString(item.type) ?? "unknown",
    available: boolean(item.available),
    state: playbackState(item.playback_state ?? item.state),
    volume,
    muted,
    activeSource: optionalString(item.active_source),
    activeGroupId: optionalString(item.active_group),
    groupLeaderId: optionalString(item.synced_to),
    groupMemberIds: strings(item.group_members ?? item.group_childs),
    staticGroupMemberIds: strings(item.static_group_members),
    capabilities: {
      volume: features.has("volume_set"),
      mute: features.has("volume_mute"),
      grouping: features.has("set_members"),
      nextPrevious: features.has("next_previous"),
    },
    canGroupWith: strings(item.can_group_with),
    hidden: boolean(item.hide_in_ui),
    private: boolean(item.private),
  };
}

export interface QueueSummary {
  id: string;
  active: boolean;
  itemCount: number;
  currentIndex: number | null;
  repeat: Queue["repeat"];
  shuffle: boolean;
}

export function decodeQueueSummary(value: unknown, path = "queue"): QueueSummary {
  const item = record(value, path);
  return {
    id: string(item.queue_id, `${path}.queue_id`),
    active: boolean(item.active, true),
    itemCount: optionalNumber(item.items) ?? 0,
    currentIndex: optionalNumber(item.current_index) ?? null,
    repeat: repeatMode(item.repeat_mode),
    shuffle: boolean(item.shuffle_enabled),
  };
}

function fallbackQueueTrack(value: RecordValue, path: string): Track {
  const queueItemId = string(value.queue_item_id, `${path}.queue_item_id`);
  const name = optionalString(value.name) ?? "Unknown Queue Item";
  return {
    kind: "track",
    itemId: queueItemId,
    provider: "queue",
    uri: optionalString(recordOrUndefined(value.media_item)?.uri) ?? `queue://${queueItemId}`,
    name,
    artist: "",
    artistUris: [],
    album: "",
    duration: optionalNumber(value.duration) ?? 0,
  };
}

function recordOrUndefined(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : undefined;
}

export function decodeQueueEntry(value: unknown, path = "queueItem", serverUrl?: string): QueueEntry {
  const item = record(value, path);
  const mediaItem = recordOrUndefined(item.media_item);
  return {
    id: string(item.queue_item_id, `${path}.queue_item_id`),
    track:
      mediaItem?.media_type === "track"
        ? decodeTrack(mediaItem, `${path}.media_item`, serverUrl)
        : fallbackQueueTrack(item, path),
  };
}

export function decodeArray<T>(value: unknown, path: string, decoder: (value: unknown, path: string) => T): T[] {
  return array(value, path).map((item, index) => decoder(item, `${path}[${index}]`));
}

export interface SearchResultPayload {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
}

export function decodeSearchResults(value: unknown, serverUrl?: string): SearchResultPayload {
  const result = record(value, "search");
  return {
    artists: decodeArray(result.artists ?? [], "search.artists", (item, path) => decodeArtist(item, path, serverUrl)),
    albums: decodeArray(result.albums ?? [], "search.albums", (item, path) => decodeAlbum(item, path, serverUrl)),
    tracks: decodeArray(result.tracks ?? [], "search.tracks", (item, path) => decodeTrack(item, path, serverUrl)),
  };
}

export interface ConnectionIdentity {
  serverId: string;
  serverVersion: string;
  schemaVersion: number;
  userId: string;
}

export function decodeConnectionIdentity(serverValue: unknown, userValue: unknown): ConnectionIdentity {
  const server = record(serverValue, "info");
  const user = record(userValue, "auth/me");
  const schemaVersion = optionalNumber(server.schema_version);
  if (schemaVersion === undefined) throw new WireError("info.schema_version", "a number");
  return {
    serverId: string(server.server_id, "info.server_id"),
    serverVersion: string(server.server_version, "info.server_version"),
    schemaVersion,
    userId: string(user.user_id, "auth/me.user_id"),
  };
}

export function resolveEffectiveQueues(players: DecodedPlayer[], queues: QueueSummary[]): Player[] {
  const queueById = new Map(queues.map((queue) => [queue.id, queue]));
  const playerById = new Map(players.map((player) => [player.id, player]));
  const resolve = (player: DecodedPlayer, seen = new Set<string>()): string | undefined => {
    if (seen.has(player.id)) return undefined;
    const visited = new Set(seen).add(player.id);
    for (const candidate of [player.activeSource, player.activeGroupId, player.groupLeaderId]) {
      if (!candidate) continue;
      if (queueById.has(candidate)) return candidate;
      const parent = playerById.get(candidate);
      if (parent) {
        const inherited = resolve(parent, visited);
        if (inherited) return inherited;
      }
    }
    return queueById.get(player.id)?.active ? player.id : undefined;
  };
  return players.map(({ hidden: _hidden, private: _private, ...player }) => {
    void _hidden;
    void _private;
    const decoded = playerById.get(player.id)!;
    const queueId = resolve(decoded);
    return { ...player, queueId };
  });
}

export function visiblePlayers(players: DecodedPlayer[]): DecodedPlayer[] {
  return players.filter((player) => !player.hidden && !player.private);
}

/** Only real track media may be favorited; synthetic queue fallback identities are never sent. */
export function decodeCurrentTrack(value: unknown, queueId: string, serverUrl?: string): Track {
  const queue = record(value, "currentQueue");
  if (queue.queue_id !== queueId) throw new WireError("currentQueue.queue_id", "the requested queue");
  if (!queue.current_item) throw new Error("Nothing is currently playing on your active player.");
  const entry = record(queue.current_item, "currentQueue.current_item");
  const media = record(entry.media_item, "currentQueue.current_item.media_item");
  if (media.media_type !== "track") throw new Error("The current item is not a favoritable track.");
  return decodeTrack(media, "currentQueue.current_item.media_item", serverUrl);
}
