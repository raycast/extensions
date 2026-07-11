import type {
  MediaSource,
  PlaybackCommand,
  SourceProvider,
} from "../core/types";
import { runAppleScript } from "../lib/applescript";

const NOW_PLAYING_SCRIPT = `tell application "Music"
  if player state is stopped then return "stopped"
  set t to current track
  return (name of t) & "|" & (artist of t) & "|" & (album of t) & "|" & (duration of t) & "|" & (player position) & "|" & (player state as text)
end tell`;

interface MusicRecord {
  title: string;
  artist: string;
  album: string;
  duration: number;
  position: number;
  isPlaying: boolean;
}

/** Split from the right: last 3 fields are duration|position|state; the rest is title|artist|album. */
export function parseMusicRecord(out: string): MusicRecord | null {
  if (out === "stopped") return null;
  const parts = out.split("|");
  if (parts.length < 6) return null;
  const state = parts.pop()!;
  const position = Number(parts.pop());
  const duration = Number(parts.pop());
  const album = parts.pop()!;
  const artist = parts.pop()!;
  const title = parts.join("|");
  if (!title || Number.isNaN(duration) || Number.isNaN(position)) return null;
  return {
    title,
    artist,
    album,
    duration,
    position,
    isPlaying: state === "playing",
  };
}

const CONTROL_MAP: Record<PlaybackCommand, string> = {
  play: "play",
  pause: "pause",
  playpause: "playpause",
  next: "next track",
  previous: "previous track",
};

export const musicProvider: SourceProvider = {
  id: "music",
  displayName: "Music",
  bundleIds: ["com.apple.Music"],
  capabilities: { control: true, artwork: false, seek: false },

  async isAvailable() {
    const out = await runAppleScript(
      'tell application "System Events" to (name of processes) contains "Music"',
    );
    return out === "true";
  },

  async getSource(): Promise<MediaSource | null> {
    const out = await runAppleScript(NOW_PLAYING_SCRIPT);
    if (out === null) return null;
    const r = parseMusicRecord(out);
    if (!r) return null;
    return {
      id: "com.apple.Music",
      appName: "Music",
      bundleId: "com.apple.Music",
      title: r.title,
      artist: r.artist,
      album: r.album,
      duration: r.duration,
      position: r.position,
      isPlaying: r.isPlaying,
      origin: "applescript",
    };
  },

  async control(cmd: PlaybackCommand) {
    await runAppleScript(`tell application "Music" to ${CONTROL_MAP[cmd]}`);
  },
};
