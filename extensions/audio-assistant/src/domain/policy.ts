import type { Item, Library, Player, Queue, RepeatMode, View } from "./model";

export class AudioAssistantError extends Error {
  constructor(
    public readonly code: "no-player" | "unavailable" | "unsupported" | "not-ready",
    message: string,
  ) {
    super(message);
    this.name = "AudioAssistantError";
  }
}
export function requirePlayer(players: Player[], id?: string): Player {
  if (!id) throw new AudioAssistantError("no-player", "Select a player and press Enter before playing music.");
  const player = players.find((candidate) => candidate.id === id);
  if (!player?.available)
    throw new AudioAssistantError("unavailable", "Your active player is unavailable. Select another player in Music.");
  return player;
}
export function requireQueue(player: Player, queues: Queue[]): Queue {
  const queue = queues.find((candidate) => candidate.id === player.queueId);
  if (!queue) throw new AudioAssistantError("unsupported", "This player has no controllable Music Assistant queue.");
  return queue;
}
export const nextRepeat = (mode: RepeatMode): RepeatMode =>
  ({ off: "one", one: "all", all: "off" })[mode] as RepeatMode;
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Volume must be a finite number.");
  return Math.max(0, Math.min(100, Math.round(value)));
}
export const itemKey = (item: Item): string =>
  item.kind === "player" ? `player:${item.id}` : `${item.kind}:${item.uri}`;

/** Demo/local policy. The live adapter must combine server search with player-name search. */
export function searchLibrary(library: Library, view: View, query: string): Item[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = (item: Item) => {
    const text =
      `${item.name} ${"artist" in item ? item.artist : ""} ${item.kind === "track" ? item.album : ""}`.toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  };
  const players = library.players.filter(matches);
  const artists = library.artists.filter(matches);
  const tracks = library.tracks.filter(matches);
  const albums = library.albums.filter(matches);
  if (view === "players") return players;
  if (view === "artists") return artists;
  if (view === "tracks") return tracks;
  if (view === "albums") return albums;
  return [...players, ...(words.length ? artists : artists.slice(0, 5)), ...tracks, ...albums];
}
