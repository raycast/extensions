import { execFile } from "child_process";
import { promisify } from "util";

const execFileP = promisify(execFile);

export type PlayerState =
  | "playing"
  | "paused"
  | "stopped"
  | "not-running"
  | "no-track";

export interface MusicState {
  state: PlayerState;
  name: string;
  artist: string;
  album: string;
  kind: string;
  trackClass: string; // "file track" | "shared track" | etc.
  sampleRate: number | null; // local files only; streaming returns 0
  bitRate: number | null; // kbps; AAC streaming or local files
}

const SCRIPT = `
on safeGet(s)
    try
        if s is missing value then return ""
        return s as string
    on error
        return ""
    end try
end safeGet

if application "Music" is not running then return "NOT_RUNNING"
tell application "Music"
    set ps to (player state as string)
    if ps is "stopped" then return "STOPPED"
    try
        set t to current track
    on error
        return "NO_TRACK"
    end try
    set nm to my safeGet(name of t)
    set ar to my safeGet(artist of t)
    set al to my safeGet(album of t)
    set kd to my safeGet(kind of t)
    set cl to (class of t as string)
    set sr to my safeGet(sample rate of t)
    set br to my safeGet(bit rate of t)
    return ps & tab & nm & tab & ar & tab & al & tab & kd & tab & cl & tab & sr & tab & br
end tell
`;

export async function fetchMusicState(): Promise<MusicState> {
  let raw = "";
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", SCRIPT], {
      timeout: 3000,
    });
    raw = stdout.trim();
  } catch {
    return emptyState("not-running");
  }

  if (raw === "NOT_RUNNING") return emptyState("not-running");
  if (raw === "STOPPED") return emptyState("stopped");
  if (raw === "NO_TRACK") return emptyState("no-track");

  const parts = raw.split("\t");
  if (parts.length < 8) return emptyState("not-running");
  const [state, name, artist, album, kind, trackClass, sr, br] = parts;
  return {
    state: state === "playing" || state === "paused" ? state : "stopped",
    name,
    artist,
    album,
    kind,
    trackClass,
    sampleRate: parseNumber(sr),
    bitRate: parseNumber(br),
  };
}

function parseNumber(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function emptyState(state: PlayerState): MusicState {
  return {
    state,
    name: "",
    artist: "",
    album: "",
    kind: "",
    trackClass: "",
    sampleRate: null,
    bitRate: null,
  };
}

export function isLocalTrack(s: MusicState): boolean {
  return s.trackClass.includes("file track");
}
