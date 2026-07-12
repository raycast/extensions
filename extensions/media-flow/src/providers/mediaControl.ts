import { existsSync } from "node:fs";
import { cacheArtwork } from "../core/artworkCache";
import type {
  MediaSource,
  PlaybackCommand,
  SourceProvider,
} from "../core/types";
import { execSafe } from "../lib/exec";

export interface RawNowPlaying {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  elapsedTime?: number;
  playing?: boolean;
  bundleIdentifier?: string;
  artworkData?: string;
  artworkMimeType?: string;
}

/** Store-installed Raycast runs with a minimal PATH that omits Homebrew's bin dirs, so
 * resolve an absolute path once at module load instead of relying on shell PATH lookup. */
function resolveMediaControlBin(): string {
  const candidates = [
    "/opt/homebrew/bin/media-control",
    "/usr/local/bin/media-control",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "media-control";
}

export const MEDIA_CONTROL_BIN = resolveMediaControlBin();
const BIN = MEDIA_CONTROL_BIN;

export function parseMediaControlOutput(json: string): RawNowPlaying | null {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (typeof o.title !== "string" || o.title.length === 0) return null;
    return {
      title: o.title,
      artist: typeof o.artist === "string" ? o.artist : undefined,
      album: typeof o.album === "string" ? o.album : undefined,
      duration: typeof o.duration === "number" ? o.duration : undefined,
      elapsedTime:
        typeof o.elapsedTime === "number" ? o.elapsedTime : undefined,
      playing: typeof o.playing === "boolean" ? o.playing : undefined,
      bundleIdentifier:
        typeof o.bundleIdentifier === "string" ? o.bundleIdentifier : undefined,
      artworkData:
        typeof o.artworkData === "string" ? o.artworkData : undefined,
      artworkMimeType:
        typeof o.artworkMimeType === "string" ? o.artworkMimeType : undefined,
    };
  } catch {
    return null;
  }
}

/** Fast, artwork-free title probe. Used to detect when a next/previous command has
 * actually landed on a new track (the player switches a beat after the command returns). */
export async function probeTitle(): Promise<string | null> {
  const out = await execSafe(BIN, ["get"], { retries: 0 });
  if (out === null) return null;
  return parseMediaControlOutput(out)?.title ?? null;
}

const COMMAND_MAP: Record<PlaybackCommand, string> = {
  play: "play",
  pause: "pause",
  playpause: "toggle-play-pause",
  next: "next-track",
  previous: "previous-track",
};

export const mediaControlProvider: SourceProvider = {
  id: "media-control",
  displayName: "System Now Playing",
  bundleIds: [],
  capabilities: { control: true, artwork: true, seek: false },

  async isAvailable() {
    return (await execSafe(BIN, ["--version"], { retries: 0 })) !== null;
  },

  async getSource(): Promise<MediaSource | null> {
    const out = await execSafe(BIN, ["get"], { retries: 0 });
    if (out === null) return null;
    const raw = parseMediaControlOutput(out);
    if (!raw) return null;
    const key = `${raw.bundleIdentifier ?? "unknown"}:${raw.title}:${raw.artist ?? ""}`;
    const artworkPath = raw.artworkData
      ? ((await cacheArtwork(key, raw.artworkData, raw.artworkMimeType)) ??
        undefined)
      : undefined;
    return {
      id: raw.bundleIdentifier ?? "media-control",
      appName: appNameFromBundle(raw.bundleIdentifier),
      bundleId: raw.bundleIdentifier,
      title: raw.title,
      artist: raw.artist,
      album: raw.album,
      artworkPath,
      duration: raw.duration,
      position: raw.elapsedTime,
      isPlaying: raw.playing ?? false,
      origin: "media-remote",
    };
  },

  async control(cmd: PlaybackCommand) {
    await execSafe(BIN, [COMMAND_MAP[cmd]], { retries: 0 });
  },
};

const KNOWN_APPS: Record<string, string> = {
  "com.apple.Music": "Music",
  "com.spotify.client": "Spotify",
  "com.tidal.desktop": "TIDAL",
  "com.deezer.deezer-desktop": "Deezer",
  "com.amazon.music": "Amazon Music",
  "org.videolan.vlc": "VLC",
  "com.apple.Safari": "Safari",
  "com.google.Chrome": "Chrome",
  "org.mozilla.firefox": "Firefox",
  "com.apple.podcasts": "Podcasts",
};

function appNameFromBundle(bundleId?: string): string {
  if (!bundleId) return "Unknown";
  return KNOWN_APPS[bundleId] ?? (bundleId.split(".").pop() || bundleId);
}
