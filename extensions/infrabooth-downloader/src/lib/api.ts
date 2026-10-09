import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";
import type { RemoteCommand, RemoteState, RemoteTrack } from "@/lib/remote-protocol";
import { filterPersonalMixes } from "@/lib/selections";
import { mapTrack, type TrackInfoJson } from "@remote/lib/trackMapping";
import {
  mapMix,
  mapPlaylist,
  type LibraryPlaylist,
  type LibraryPlaylistJson,
  type Mix,
  type SelectionJson,
} from "./mapping";
import { mapResolvedLink, type ResolvedLink, type ResolvedLinkJson } from "./resolveLink";

const APP_IDENTIFIER = "com.infrabooth.downloader";

export function discoveryFilePath(platform: NodeJS.Platform, home: string, appData: string | undefined): string {
  if (platform === "win32") {
    return win32.join(appData ?? win32.join(home, "AppData", "Roaming"), APP_IDENTIFIER, "raycast.json");
  }
  return posix.join(home, "Library", "Application Support", APP_IDENTIFIER, "raycast.json");
}

const DISCOVERY_FILE = discoveryFilePath(process.platform, homedir(), process.env.APPDATA);

export class AppNotRunningError extends Error {
  constructor(reason: string) {
    super(`InfraBooth Downloader is not running (${reason})`);
    this.name = "AppNotRunningError";
  }
}

export class ApiError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(detail ? `${path} failed: ${detail}` : `${path} failed with status ${status}`);
    this.name = "ApiError";
  }
}

export class SignedOutError extends Error {
  constructor(readonly path: string) {
    super(`${path} requires signing in to InfraBooth Downloader`);
    this.name = "SignedOutError";
  }
}

interface Discovery {
  port: number;
  token: string;
}

async function readDiscovery(): Promise<Discovery> {
  try {
    return JSON.parse(await readFile(DISCOVERY_FILE, "utf8")) as Discovery;
  } catch (error) {
    throw new AppNotRunningError(`discovery file unreadable: ${String(error)}`);
  }
}

function isConnectionRefused(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  return cause?.code === "ECONNREFUSED";
}

async function request(path: string, params: Record<string, string> = {}, init?: RequestInit): Promise<Response> {
  const { port, token } = await readDiscovery();
  const query = new URLSearchParams({ ...params, token });
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${port}${path}?${query}`, init);
  } catch (error) {
    if (isConnectionRefused(error)) throw new AppNotRunningError("connection refused");
    throw error;
  }
  if (response.status === 401) throw new AppNotRunningError("token rejected");
  if (response.status === 403) throw new SignedOutError(path);
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).trim();
    throw new ApiError(path, response.status, detail || undefined);
  }
  return response;
}

async function getJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const response = await request(path, params);
  return (await response.json()) as T;
}

export async function getStateSocketUrl(): Promise<string> {
  const { port, token } = await readDiscovery();
  return `ws://127.0.0.1:${port}/ws?${new URLSearchParams({ token })}`;
}

export async function sendCommand(command: RemoteCommand): Promise<void> {
  await request(
    "/api/command",
    {},
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    },
  );
}

export function getState(): Promise<RemoteState> {
  return getJson<RemoteState>("/api/state");
}

export async function resolveLink(url: string): Promise<ResolvedLink> {
  return mapResolvedLink(await getJson<ResolvedLinkJson>("/api/resolve-link", { url }));
}

export interface SearchPage {
  limit: number;
  offset: number;
}

function searchParams(query: string, page?: SearchPage): Record<string, string> {
  return page ? { q: query, limit: String(page.limit), offset: String(page.offset) } : { q: query };
}

export async function searchTracks(query: string, page?: SearchPage): Promise<RemoteTrack[]> {
  return (await getJson<TrackInfoJson[]>("/api/search", searchParams(query, page))).map(mapTrack);
}

export async function searchPlaylists(query: string, page?: SearchPage): Promise<LibraryPlaylist[]> {
  return (await getJson<LibraryPlaylistJson[]>("/api/search-playlists", searchParams(query, page))).map(mapPlaylist);
}

export async function searchAlbums(query: string, page?: SearchPage): Promise<LibraryPlaylist[]> {
  return (await getJson<LibraryPlaylistJson[]>("/api/search-albums", searchParams(query, page))).map(mapPlaylist);
}

function playlistParams(id: number, secret: string | null): Record<string, string> {
  return secret ? { id: String(id), secret } : { id: String(id) };
}

export async function prefetchPlaylistTracks(id: number, secret: string | null): Promise<void> {
  await (await request("/api/playlist-tracks", playlistParams(id, secret))).arrayBuffer();
}

export async function getPlaylistTracks(id: number, secret: string | null): Promise<RemoteTrack[]> {
  return (await getJson<TrackInfoJson[]>("/api/playlist-tracks", playlistParams(id, secret))).map(mapTrack);
}

type StreamEvent<T> = { type: "batch"; items: T[] } | { type: "done"; items: T[] } | { type: "error"; message: string };

export type BatchListener<T> = (items: T[]) => void;

export function handleStreamLine<T>(path: string, line: string, onBatch: BatchListener<T>): T[] | undefined {
  const event = JSON.parse(line) as StreamEvent<T>;
  if (event.type === "batch") {
    onBatch(event.items);
    return undefined;
  }
  if (event.type === "done") return event.items;
  throw new ApiError(path, 500, event.message);
}

async function streamJson<T>(
  path: string,
  params: Record<string, string>,
  onBatch: BatchListener<T>,
  signal?: AbortSignal,
): Promise<T[]> {
  const response = await request(path, { ...params, stream: "true" }, { signal });
  if (!response.body) throw new ApiError(path, response.status);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) throw new ApiError(path, 500, "stream ended before completion");
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines.filter(Boolean)) {
      const result = handleStreamLine(path, line, onBatch);
      if (result) return result;
    }
  }
}

async function streamMapped<Json, T>(
  path: string,
  params: Record<string, string>,
  map: (json: Json) => T,
  onBatch: BatchListener<T>,
  signal?: AbortSignal,
): Promise<T[]> {
  return (await streamJson<Json>(path, params, (batch) => onBatch(batch.map(map)), signal)).map(map);
}

async function emptyWhenSignedOut<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof SignedOutError) {
      console.info(`${label} unavailable: signed out`);
      return [];
    }
    throw error;
  }
}

export function streamLikedTracks(onBatch: BatchListener<RemoteTrack>, signal?: AbortSignal): Promise<RemoteTrack[]> {
  return emptyWhenSignedOut("Liked tracks", () => streamMapped("/api/liked-tracks", {}, mapTrack, onBatch, signal));
}

export function streamLibraryPlaylists(
  onBatch: BatchListener<LibraryPlaylist>,
  signal?: AbortSignal,
): Promise<LibraryPlaylist[]> {
  return emptyWhenSignedOut("Library playlists", () => streamMapped("/api/library", {}, mapPlaylist, onBatch, signal));
}

export function streamPlaylistTracks(
  id: number,
  secret: string | null,
  onBatch: BatchListener<RemoteTrack>,
  signal?: AbortSignal,
): Promise<RemoteTrack[]> {
  return streamMapped("/api/playlist-tracks", playlistParams(id, secret), mapTrack, onBatch, signal);
}

export interface PlaylistArtwork {
  id: number;
  url: string | null;
}

export function streamLibraryArtworks(
  onBatch: BatchListener<PlaylistArtwork>,
  signal?: AbortSignal,
): Promise<PlaylistArtwork[]> {
  return emptyWhenSignedOut("Library artworks", () => streamJson("/api/library-artworks", {}, onBatch, signal));
}

export function getMixes(): Promise<Mix[]> {
  return emptyWhenSignedOut("Mixes", async () =>
    filterPersonalMixes((await getJson<SelectionJson[]>("/api/selections")).map(mapMix)),
  );
}
