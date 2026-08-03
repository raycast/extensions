import type { MediaSource, PlaybackCommand, SourceProvider } from "../core/types";
import { runAppleScript } from "../lib/applescript";

const NOW_PLAYING_SCRIPT = `tell application "Spotify"
  if player state is stopped then return "stopped"
  set t to current track
  return (name of t) & "|" & (artist of t) & "|" & (album of t) & "|" & (duration of t) & "|" & (player position) & "|" & (player state as text) & "|" & (artwork url of t) & "|" & (spotify url of t)
end tell`;

interface SpotifyRecord {
  title: string;
  artist: string;
  album: string;
  duration: number;
  position: number;
  isPlaying: boolean;
  artworkUrl: string;
  url: string;
}

function toWebUrl(raw: string): string {
  return raw.replace(/^spotify:track:(.+)$/, "https://open.spotify.com/track/$1");
}

/**
 * Split from the right: last 5 fields are duration(ms)|position(s)|state|artworkUrl|spotifyUrl;
 * the rest is title|artist|album (split right again: album, artist, title-with-pipes).
 */
export function parseSpotifyRecord(out: string): SpotifyRecord | null {
  if (out === "stopped") return null;
  const parts = out.split("|");
  if (parts.length < 8) return null;
  const spotifyUrl = parts.pop()!;
  const artworkUrl = parts.pop()!;
  const state = parts.pop()!;
  const position = Number(parts.pop());
  const durationMs = Number(parts.pop());
  const album = parts.pop()!;
  const artist = parts.pop()!;
  const title = parts.join("|");
  if (!title || Number.isNaN(durationMs) || Number.isNaN(position)) return null;
  return {
    title,
    artist,
    album,
    duration: durationMs / 1000,
    position,
    isPlaying: state === "playing",
    artworkUrl,
    url: toWebUrl(spotifyUrl),
  };
}

const CONTROL_MAP: Record<PlaybackCommand, string> = {
  play: "play",
  pause: "pause",
  playpause: "playpause",
  next: "next track",
  previous: "previous track",
};

export const spotifyProvider: SourceProvider = {
  id: "spotify",
  displayName: "Spotify",
  bundleIds: ["com.spotify.client"],
  capabilities: { control: true, artwork: false, seek: false },

  async isAvailable() {
    const out = await runAppleScript('tell application "System Events" to (name of processes) contains "Spotify"');
    return out === "true";
  },

  async getSource(): Promise<MediaSource | null> {
    const out = await runAppleScript(NOW_PLAYING_SCRIPT);
    if (out === null) return null;
    const r = parseSpotifyRecord(out);
    if (!r) return null;
    return {
      id: "com.spotify.client",
      appName: "Spotify",
      bundleId: "com.spotify.client",
      title: r.title,
      artist: r.artist,
      album: r.album,
      duration: r.duration,
      position: r.position,
      isPlaying: r.isPlaying,
      origin: "applescript",
      url: r.url,
    };
  },

  async control(cmd: PlaybackCommand) {
    await runAppleScript(`tell application "Spotify" to ${CONTROL_MAP[cmd]}`);
  },
};
