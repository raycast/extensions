import { environment } from "@raycast/api";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { allSounds, BASE_URL, Sound } from "./sounds";

type Entry = { pid: number; volume: number };
type State = Record<string, Entry>;

const stateFile = path.join(environment.supportPath, "playing.json");
const cacheDir = path.join(environment.supportPath, "sounds");

export const VOLUMES = [0.1, 0.25, 0.5, 0.75, 1];
export const DEFAULT_VOLUME = 0.5;

const VOLUME_STEP = 0.05;

/** Move volume by 5%. Stays put below the quietest preset or above the loudest. */
export function stepVolume(current: number, direction: 1 | -1): number {
  const min = VOLUMES[0];
  const max = VOLUMES[VOLUMES.length - 1];
  switch (direction) {
    case 1: {
      if (current >= max) return current;
      return Math.min(max, Math.round((current + VOLUME_STEP) * 100) / 100);
    }
    case -1: {
      if (current <= min) return current;
      return Math.max(min, Math.round((current - VOLUME_STEP) * 100) / 100);
    }
    default: {
      const unreachable: never = direction;
      return unreachable;
    }
  }
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readState(): State {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8")) as State;
  } catch {
    return {};
  }
}

function writeState(state: State) {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state));
}

/** Playing sounds, pruning entries whose process has died. */
export function getPlaying(): State {
  const state = readState();
  const alive = Object.fromEntries(Object.entries(state).filter(([, e]) => isAlive(e.pid)));
  if (Object.keys(alive).length !== Object.keys(state).length) writeState(alive);
  return alive;
}

export function findSound(id: string): Sound | undefined {
  return allSounds.find((s) => s.id === id);
}

export function isCached(sound: Sound) {
  return fs.existsSync(localFile(sound));
}

function localFile(sound: Sound) {
  return path.join(cacheDir, sound.path.replace(/^\/sounds\//, ""));
}

async function ensureDownloaded(sound: Sound) {
  const file = localFile(sound);
  if (fs.existsSync(file)) return file;
  const res = await fetch(BASE_URL + sound.path);
  if (!res.ok) throw new Error(`Failed to download ${sound.label} (${res.status})`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, file);
  return file;
}

// WPF's MediaPlayer ships with Windows and plays MP3 with volume control; MediaEnded only fires while a dispatcher loop runs.
const WINDOWS_PLAYER_SCRIPT = Buffer.from(
  [
    "Add-Type -AssemblyName PresentationCore, WindowsBase",
    "$player = New-Object System.Windows.Media.MediaPlayer",
    "$player.Volume = [double]$env:MOODIST_VOLUME",
    "$player.add_MediaEnded({ $player.Position = [TimeSpan]::Zero; $player.Play() })",
    "$player.add_MediaFailed({ [Environment]::Exit(1) })",
    "$player.Open([Uri]$env:MOODIST_FILE)",
    "$player.Play()",
    "[System.Windows.Threading.Dispatcher]::Run()",
  ].join("\n"),
  "utf16le",
).toString("base64");

function spawnLoop(file: string, volume: number) {
  if (process.platform === "win32") {
    return spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", WINDOWS_PLAYER_SCRIPT],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env, MOODIST_FILE: file, MOODIST_VOLUME: String(volume) },
      },
    );
  }
  return spawn(
    "/bin/sh",
    ["-c", 'while :; do /usr/bin/afplay -v "$1" "$2" || exit 1; done', "sh", String(volume), file],
    {
      detached: true,
      stdio: "ignore",
    },
  );
}

function kill(pid: number) {
  // On macOS the detached loop runs in its own process group; kill the group so afplay dies too.
  const targets = process.platform === "win32" ? [pid] : [-pid, pid];
  for (const target of targets) {
    try {
      process.kill(target, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

export async function play(id: string, volume?: number) {
  const sound = findSound(id);
  if (!sound) throw new Error(`Unknown sound: ${id}`);
  const file = await ensureDownloaded(sound);
  const state = getPlaying();
  const vol = volume ?? state[id]?.volume ?? DEFAULT_VOLUME;
  if (state[id]) kill(state[id].pid);

  const child = spawnLoop(file, vol);
  child.unref();
  if (!child.pid) throw new Error(`Could not start ${sound.label}`);
  state[id] = { pid: child.pid, volume: vol };
  writeState(state);
}

export function stop(id: string) {
  const state = getPlaying();
  if (state[id]) kill(state[id].pid);
  delete state[id];
  writeState(state);
}

export function stopAll() {
  const state = getPlaying();
  Object.values(state).forEach((e) => kill(e.pid));
  writeState({});
  return Object.keys(state).length;
}

export async function setVolume(id: string, volume: number) {
  // The player process can't change volume live, so restart the loop at the new level.
  if (getPlaying()[id]) await play(id, volume);
}
