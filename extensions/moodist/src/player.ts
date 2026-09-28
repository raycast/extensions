import { environment, getPreferenceValues } from "@raycast/api";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { allSounds, BASE_URL, Sound } from "./sounds";

/** A sound in the mix. It is playing while `pid` is set, and paused otherwise. */
export type MixSound = { volume: number; pid?: number };
export type SleepTimer = { endsAt: number; minutes: number; pid?: number };
/** `preset` is the id of the preset the mix was last loaded from, even if the mix has changed since. */
export type Mix = { master: number; sounds: Record<string, MixSound>; timer?: SleepTimer; preset?: string };
export type MixInput = { soundId: string; volume: number }[];

const stateFile = path.join(environment.supportPath, "mix.json");
const legacyRegistryFile = path.join(environment.supportPath, "pid-registry.json");
const cacheDir = path.join(environment.supportPath, "sounds");

export const VOLUMES = [0.1, 0.25, 0.5, 0.75, 1];
export const DEFAULT_VOLUME = 0.5;
export const MAX_TIMER_MINUTES = 24 * 60;

const MIN_VOLUME = 0.05;
const VOLUME_STEP = 0.05;

export function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(MIN_VOLUME, Math.round(volume * 100) / 100));
}

export function percent(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

export function defaultVolume(): number {
  const { defaultVolume } = getPreferenceValues<Preferences>();
  const parsed = Number(defaultVolume);
  return Number.isFinite(parsed) && parsed > 0 ? clampVolume(parsed / 100) : DEFAULT_VOLUME;
}

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

export function findSound(id: string): Sound | undefined {
  return allSounds.find((s) => s.id === id);
}

function requireSound(id: string): Sound {
  const sound = findSound(id);
  if (!sound) throw new Error(`Unknown sound: ${id}`);
  return sound;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPid(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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

function parseMix(raw: unknown): Mix {
  const mix: Mix = { master: 1, sounds: {} };
  if (!isRecord(raw)) return mix;
  if (typeof raw.master === "number") mix.master = clampVolume(raw.master);
  if (isRecord(raw.sounds)) {
    for (const [id, entry] of Object.entries(raw.sounds)) {
      if (!findSound(id) || !isRecord(entry) || typeof entry.volume !== "number") continue;
      mix.sounds[id] = { volume: clampVolume(entry.volume), pid: asPid(entry.pid) };
    }
  }
  const timer = raw.timer;
  if (isRecord(timer) && typeof timer.endsAt === "number" && typeof timer.minutes === "number") {
    mix.timer = { endsAt: timer.endsAt, minutes: timer.minutes, pid: asPid(timer.pid) };
  }
  if (typeof raw.preset === "string") mix.preset = raw.preset;
  return mix;
}

function readMix(): Mix {
  try {
    return parseMix(JSON.parse(fs.readFileSync(stateFile, "utf8")));
  } catch {
    return parseMix(undefined);
  }
}

function writeMix(mix: Mix) {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const tmp = `${stateFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(mix));
  fs.renameSync(tmp, stateFile);
}

/** Stops loops left running by the Swift looper that earlier releases used. */
function stopLegacyLoops() {
  if (!fs.existsSync(legacyRegistryFile)) return;
  try {
    const registry: unknown = JSON.parse(fs.readFileSync(legacyRegistryFile, "utf8"));
    const entries = isRecord(registry) && Array.isArray(registry.entries) ? registry.entries : [];
    for (const entry of entries) {
      const pid = isRecord(entry) ? asPid(entry.pid) : undefined;
      if (pid) kill(pid);
    }
  } catch {
    // unreadable registry; nothing to stop
  }
  fs.rmSync(legacyRegistryFile, { force: true });
}

function pauseSounds(mix: Mix): number {
  let paused = 0;
  for (const entry of Object.values(mix.sounds)) {
    if (!entry.pid) continue;
    kill(entry.pid);
    delete entry.pid;
    paused++;
  }
  return paused;
}

/** Current mix, with dead processes marked as paused and an expired sleep timer applied. */
export function getMix(): Mix {
  stopLegacyLoops();
  const mix = readMix();
  let changed = false;
  for (const entry of Object.values(mix.sounds)) {
    if (entry.pid && !isAlive(entry.pid)) {
      delete entry.pid;
      changed = true;
    }
  }
  if (mix.timer && mix.timer.endsAt <= Date.now()) {
    pauseSounds(mix);
    delete mix.timer;
    changed = true;
  }
  if (changed) writeMix(mix);
  return mix;
}

export function playingCount(mix: Mix): number {
  return Object.values(mix.sounds).filter((s) => s.pid).length;
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

async function downloadAll(ids: string[]): Promise<Record<string, string>> {
  const files = await Promise.all(ids.map((id) => ensureDownloaded(requireSound(id))));
  return Object.fromEntries(ids.map((id, i) => [id, files[i]]));
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

function start(mix: Mix, id: string, file: string) {
  const entry = mix.sounds[id];
  if (entry.pid) kill(entry.pid);
  const child = spawnLoop(file, Math.max(0.01, Math.round(entry.volume * mix.master * 100) / 100));
  child.unref();
  if (!child.pid) throw new Error(`Could not start ${requireSound(id).label}`);
  entry.pid = child.pid;
}

/** Start a sound, adding it to the mix if needed. Keeps its mix volume unless one is given. */
export async function play(id: string, volume?: number) {
  const file = await ensureDownloaded(requireSound(id));
  const mix = getMix();
  mix.sounds[id] = { ...mix.sounds[id], volume: clampVolume(volume ?? mix.sounds[id]?.volume ?? defaultVolume()) };
  start(mix, id, file);
  writeMix(mix);
}

/** Stop a sound and remove it from the mix. */
export function stop(id: string) {
  const mix = getMix();
  const entry = mix.sounds[id];
  if (!entry) return;
  if (entry.pid) kill(entry.pid);
  delete mix.sounds[id];
  writeMix(mix);
}

/** Stop every sound but keep the mix so it can resume. */
export function pause(): number {
  const mix = getMix();
  const paused = pauseSounds(mix);
  writeMix(mix);
  return paused;
}

/** Start every paused sound in the mix. */
export async function resume(): Promise<number> {
  const before = getMix();
  const ids = Object.keys(before.sounds).filter((id) => !before.sounds[id].pid);
  const files = await downloadAll(ids);
  const mix = getMix();
  let started = 0;
  for (const id of ids) {
    if (!mix.sounds[id] || mix.sounds[id].pid) continue;
    start(mix, id, files[id]);
    started++;
  }
  writeMix(mix);
  return started;
}

export type ToggleResult = { action: "paused" | "resumed"; count: number } | { action: "empty" };

export async function togglePlayback(): Promise<ToggleResult> {
  const mix = getMix();
  if (playingCount(mix) > 0) return { action: "paused", count: pause() };
  if (Object.keys(mix.sounds).length === 0) return { action: "empty" };
  return { action: "resumed", count: await resume() };
}

/** Stop every sound and clear the mix. Returns how many sounds were in it. */
export function stopAll(): number {
  const mix = getMix();
  pauseSounds(mix);
  const count = Object.keys(mix.sounds).length;
  mix.sounds = {};
  delete mix.preset;
  writeMix(mix);
  return count;
}

// The player process can't change volume live, so changing volume restarts the loop at the new level.
export async function setVolume(id: string, volume: number) {
  const file = await ensureDownloaded(requireSound(id));
  const mix = getMix();
  const entry = mix.sounds[id];
  if (!entry) return;
  entry.volume = clampVolume(volume);
  if (entry.pid) start(mix, id, file);
  writeMix(mix);
}

export async function setMaster(volume: number) {
  const before = getMix();
  const files = await downloadAll(Object.keys(before.sounds).filter((id) => before.sounds[id].pid));
  const mix = getMix();
  mix.master = clampVolume(volume);
  for (const id of Object.keys(files)) {
    if (mix.sounds[id]?.pid) start(mix, id, files[id]);
  }
  writeMix(mix);
}

/** Replace the mix with the given sounds and start them all. */
export async function loadMix(sounds: MixInput, master: number, presetId?: string) {
  const valid = sounds.filter((s) => findSound(s.soundId));
  if (valid.length === 0) throw new Error("This mix has no playable sounds");
  const files = await downloadAll(valid.map((s) => s.soundId));
  const mix = getMix();
  pauseSounds(mix);
  mix.master = clampVolume(master);
  mix.sounds = Object.fromEntries(valid.map((s) => [s.soundId, { volume: clampVolume(s.volume) }]));
  if (presetId) mix.preset = presetId;
  else delete mix.preset;
  for (const s of valid) start(mix, s.soundId, files[s.soundId]);
  writeMix(mix);
}

// Runs in a detached Node process so the timer fires even when no Raycast command is open.
// It must stay in sync with `kill` and the Mix shape above.
const TIMER_SCRIPT = `
const fs = require("fs");
const [file, endsAt] = process.argv.slice(1);
setTimeout(() => {
  let mix;
  try { mix = JSON.parse(fs.readFileSync(file, "utf8")); } catch { return; }
  if (!mix.timer || mix.timer.endsAt !== Number(endsAt)) return;
  for (const entry of Object.values(mix.sounds || {})) {
    if (!entry.pid) continue;
    for (const target of process.platform === "win32" ? [entry.pid] : [-entry.pid, entry.pid]) {
      try { process.kill(target, "SIGTERM"); } catch {}
    }
    delete entry.pid;
  }
  delete mix.timer;
  fs.writeFileSync(file + ".tmp", JSON.stringify(mix));
  fs.renameSync(file + ".tmp", file);
}, Math.max(0, Number(endsAt) - Date.now()));
`;

function stopTimerProcess(timer: SleepTimer | undefined) {
  if (timer?.pid && isAlive(timer.pid)) kill(timer.pid);
}

/** Pause the mix after `minutes`. Replaces any running timer. */
export function setTimer(minutes: number): SleepTimer {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TIMER_MINUTES) {
    throw new Error(`Timer must be between 1 and ${MAX_TIMER_MINUTES} minutes`);
  }
  const mix = getMix();
  stopTimerProcess(mix.timer);
  const endsAt = Date.now() + minutes * 60_000;
  const child = spawn(process.execPath, ["-e", TIMER_SCRIPT, stateFile, String(endsAt)], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  // If the timer process can't start, getMix still applies the expiry the next time any command runs.
  child.on("error", () => undefined);
  child.unref();
  mix.timer = { endsAt, minutes, pid: child.pid };
  writeMix(mix);
  return mix.timer;
}

export function cancelTimer(): boolean {
  const mix = getMix();
  if (!mix.timer) return false;
  stopTimerProcess(mix.timer);
  delete mix.timer;
  writeMix(mix);
  return true;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function timerRemaining(timer: SleepTimer): string {
  return formatMinutes(Math.max(1, Math.ceil((timer.endsAt - Date.now()) / 60_000)));
}
