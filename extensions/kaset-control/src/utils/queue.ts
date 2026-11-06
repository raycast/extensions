// Pure queue helpers — no Raycast imports, so they are unit-testable.
// The AppleScript wrappers that use these live in ./kaset.ts.

export interface QueueTrack {
  name: string;
  artist: string;
  album: string;
  duration: number;
  id: string;
  audioVideoId?: string;
  artworkURL: string;
}

export interface PlayQueue {
  currentIndex: number;
  tracks: QueueTrack[];
}

export function isValidVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

export function parsePlayQueue(raw: string): PlayQueue {
  const parsed = JSON.parse(raw) as {
    currentIndex?: unknown;
    tracks?: unknown;
  };
  const rawTracks = Array.isArray(parsed.tracks) ? parsed.tracks : [];

  return {
    currentIndex:
      typeof parsed.currentIndex === "number" ? parsed.currentIndex : 0,
    tracks: rawTracks.map((track) => {
      const t = (track ?? {}) as Record<string, unknown>;
      return {
        name: asString(t.name) ?? "Unknown",
        artist: asString(t.artist) ?? "Unknown Artist",
        album: asString(t.album) ?? "",
        duration: typeof t.duration === "number" ? t.duration : 0,
        id: asString(t.videoId) ?? "",
        audioVideoId: asString(t.audioVideoId),
        artworkURL: asString(t.artworkURL) ?? "",
      };
    }),
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function appleScriptList(ids: string[]): string {
  return `{${ids.map((id) => `"${id}"`).join(", ")}}`;
}

export function buildPlayTrackAtIndex(index: number): string {
  return `tell application "Kaset" to play track at index ${index}`;
}

export function buildRemoveFromQueue(id: string): string {
  return `tell application "Kaset" to remove from queue "${id}"`;
}

export function buildAddToQueue(ids: string[], next = false): string {
  const suffix = next ? " with next" : "";
  return `tell application "Kaset" to add to queue ${appleScriptList(ids)}${suffix}`;
}

export function buildPlayVideos(ids: string[], startingAt?: number): string {
  const suffix = startingAt === undefined ? "" : ` starting at ${startingAt}`;
  return `tell application "Kaset" to play videos ${appleScriptList(ids)}${suffix}`;
}
