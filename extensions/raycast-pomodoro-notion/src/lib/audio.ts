import { LocalStorage, environment } from "@raycast/api";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

import type { PomodoroConfig } from "./preferences";
import type { PomodoroSession } from "./pomodoro-machine";

const AUDIO_STATE_KEY = "audio-process-state";
const LAST_ALARM_SESSION_KEY = "last-alarm-session-id";
const DEFAULT_ALARM_SOUND = "/System/Library/Sounds/Glass.aiff";

/** WorkLogForm（Notion 保存画面）表示中はループ音を鳴らさない */
let workLogFormActiveCount = 0;

/** stop / play の競合でループが二重起動しないよう直列化する */
let audioOperationLock: Promise<void> = Promise.resolve();

export function acquireWorkLogFormAudio(): () => void {
  workLogFormActiveCount += 1;
  void stopLoopingAudio();
  return () => {
    workLogFormActiveCount = Math.max(0, workLogFormActiveCount - 1);
  };
}

export function isWorkLogFormBlockingLoopAudio(): boolean {
  return workLogFormActiveCount > 0;
}

export type SyncAudioOptions = {
  /** Notion 保存画面表示中でも、明示的に次セッションの音へ切り替える */
  force?: boolean;
  /** 一時停止からの再開など、既存ループ判定を無視して張り直す */
  restart?: boolean;
};

type AudioKind = "work" | "break";
type AudioSourceKind = "user" | "bundled" | "system" | "none";

type AudioProcessState = {
  pid: number;
  kind: AudioKind;
  filePath: string;
  volume: number;
};

export type AudioSelection = {
  source: AudioSourceKind;
  filePath?: string;
  label: string;
};

function withAudioLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = audioOperationLock.then(operation, operation);
  audioOperationLock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function escapeShellArgument(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** macOS afplay の -v は 0.0（無音）〜 1.0（最大） */
function volumePercentToAfplayArgument(percent: number): string {
  const normalized = Math.max(0, Math.min(100, percent)) / 100;
  return normalized.toFixed(2);
}

function resolveLoopVolume(kind: AudioKind, config: PomodoroConfig): number {
  return kind === "work" ? config.workVolume : config.breakVolume;
}

function buildLoopShellCommand(filePath: string, volume: number): string {
  const afplayVolume = volumePercentToAfplayArgument(volume);
  return [
    // exit しないと SIGTERM 後に while が afplay を再起動してしまう
    "trap 'kill 0; exit 0' TERM INT",
    `while true; do afplay -v ${afplayVolume} ${escapeShellArgument(filePath)} >/dev/null 2>&1; done`,
  ].join("; ");
}

function countProcessesMatching(pattern: string): number {
  const result = spawnSync("pgrep", ["-f", pattern], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) {
    return 0;
  }

  return result.stdout.trim().split("\n").filter(Boolean).length;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getProcessCommand(pid: number): string | null {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }

  const command = result.stdout.trim();
  return command || null;
}

function isLoopShellProcess(pid: number, filePath: string): boolean {
  const command = getProcessCommand(pid);
  if (!command) {
    return false;
  }

  return command.includes("while true; do afplay") && command.includes(filePath);
}

/** 1 ループ = sh + afplay の 2 プロセス。それを超えたら二重起動とみなす */
function hasDuplicateLoopProcesses(filePath: string): boolean {
  const fileName = filePath.split("/").pop();
  if (!fileName) {
    return false;
  }

  return countProcessesMatching(escapeRegex(fileName)) > 2;
}

function getBundledAudioPath(fileName: string): string | undefined {
  const candidate = join(environment.assetsPath, "audio", fileName);
  return existsSync(candidate) ? candidate : undefined;
}

function resolveLoopAudioSelection(kind: AudioKind, config: PomodoroConfig): AudioSelection {
  if (kind === "work") {
    if (config.workSoundFile && existsSync(config.workSoundFile)) {
      return {
        source: "user",
        filePath: config.workSoundFile,
        label: `Custom file: ${config.workSoundFile}`,
      };
    }

    const bundled = getBundledAudioPath("rain-ambient.mp3");
    if (bundled) {
      return {
        source: "bundled",
        filePath: bundled,
        label: "Bundled: rain-ambient.mp3",
      };
    }

    return {
      source: "none",
      label: "Not set",
    };
  }

  if (config.breakSoundFile && existsSync(config.breakSoundFile)) {
    return {
      source: "user",
      filePath: config.breakSoundFile,
      label: `Custom file: ${config.breakSoundFile}`,
    };
  }

  const bundled = getBundledAudioPath("break-piano.mp3");
  if (bundled) {
    return {
      source: "bundled",
      filePath: bundled,
      label: "Bundled: break-piano.mp3",
    };
  }

  return {
    source: "none",
    label: "Not set",
  };
}

function resolveAlarmSelection(config: PomodoroConfig): AudioSelection {
  if (config.alarmSoundFile && existsSync(config.alarmSoundFile)) {
    return {
      source: "user",
      filePath: config.alarmSoundFile,
      label: `Custom file: ${config.alarmSoundFile}`,
    };
  }

  const bundled = getBundledAudioPath("alarm-bell.mp3");
  if (bundled) {
    return {
      source: "bundled",
      filePath: bundled,
      label: "Bundled: alarm-bell.mp3",
    };
  }

  if (existsSync(DEFAULT_ALARM_SOUND)) {
    return {
      source: "system",
      filePath: DEFAULT_ALARM_SOUND,
      label: `macOS system sound: ${DEFAULT_ALARM_SOUND}`,
    };
  }

  return {
    source: "none",
    label: "Not set",
  };
}

async function getAudioState(): Promise<AudioProcessState | null> {
  const raw = await LocalStorage.getItem<string>(AUDIO_STATE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AudioProcessState;
  } catch {
    await LocalStorage.removeItem(AUDIO_STATE_KEY);
    return null;
  }
}

async function setAudioState(state: AudioProcessState): Promise<void> {
  await LocalStorage.setItem(AUDIO_STATE_KEY, JSON.stringify(state));
}

async function clearAudioState(): Promise<void> {
  await LocalStorage.removeItem(AUDIO_STATE_KEY);
}

async function getLastAlarmSessionId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(LAST_ALARM_SESSION_KEY)) ?? null;
}

async function setLastAlarmSessionId(sessionId: string): Promise<void> {
  await LocalStorage.setItem(LAST_ALARM_SESSION_KEY, sessionId);
}

const BUNDLED_LOOP_AUDIO_FILES = ["rain-ambient.mp3", "break-piano.mp3"] as const;

/** 絶対パスを含むパターンのみ使う（basename だとユーザーの同名ファイルを巻き込む） */
function collectLoopAudioFilePaths(knownFilePath?: string): string[] {
  const filePaths = new Set<string>();

  if (knownFilePath) {
    filePaths.add(knownFilePath);
  }

  for (const fileName of BUNDLED_LOOP_AUDIO_FILES) {
    const bundled = getBundledAudioPath(fileName);
    if (bundled) {
      filePaths.add(bundled);
    }
  }

  return [...filePaths];
}

function killProcessTree(pid: number): void {
  for (const signal of ["SIGTERM", "SIGKILL"] as const) {
    try {
      process.kill(-pid, signal);
    } catch {
      // Process group kill can fail if the PID is not a group leader.
    }

    try {
      process.kill(pid, signal);
    } catch {
      // PID may already be gone.
    }
  }

  spawnSync("sleep", ["0.05"], { stdio: "ignore" });

  if (isProcessAlive(pid)) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // ignore
    }
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ignore
    }
  }
}

function killProcessesMatching(patterns: readonly string[], signal: "SIGTERM" | "SIGKILL" = "SIGTERM"): void {
  const flag = signal === "SIGKILL" ? "-9" : undefined;
  for (const pattern of patterns) {
    spawnSync("pkill", flag ? ["-9", "-f", pattern] : ["-f", pattern], {
      stdio: "ignore",
    });
  }
}

function killAllExtensionLoopProcesses(knownFilePath?: string): void {
  const filePaths = collectLoopAudioFilePaths(knownFilePath);
  // SIGKILL を先に使う。SIGTERM だけだと trap 前の古いループが while で再起動しうる。
  const patterns = filePaths.flatMap((filePath) => {
    const escaped = escapeRegex(filePath);
    return [`while true; do afplay.*${escaped}`, `afplay.*${escaped}`];
  });

  killProcessesMatching(patterns, "SIGKILL");
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isMatchingLoopActive(state: AudioProcessState, kind: AudioKind, filePath: string, volume: number): boolean {
  if (typeof state.volume !== "number") {
    return false;
  }

  if (hasDuplicateLoopProcesses(filePath)) {
    return false;
  }

  if (state.kind !== kind || state.filePath !== filePath || state.volume !== volume) {
    return false;
  }

  if (!isProcessAlive(state.pid)) {
    return false;
  }

  // PID 再利用や停止後の stale state で「再生中」と誤判定しない
  return isLoopShellProcess(state.pid, filePath);
}

async function stopLoopingAudioInternal(): Promise<void> {
  const state = await getAudioState();
  if (state?.pid && isProcessAlive(state.pid)) {
    killProcessTree(state.pid);
  }

  killAllExtensionLoopProcesses(state?.filePath);
  await clearAudioState();
}

export async function stopLoopingAudio(): Promise<void> {
  return withAudioLock(stopLoopingAudioInternal);
}

async function playLoopingAudioInternal(
  kind: AudioKind,
  config: PomodoroConfig,
  options?: SyncAudioOptions,
): Promise<boolean> {
  if (!options?.force && isWorkLogFormBlockingLoopAudio()) {
    return false;
  }

  const selection = resolveLoopAudioSelection(kind, config);
  if (!selection.filePath) {
    await stopLoopingAudioInternal();
    return false;
  }

  const filePath = selection.filePath;
  const volume = resolveLoopVolume(kind, config);
  const existing = await getAudioState();

  if (!options?.restart && existing && isMatchingLoopActive(existing, kind, filePath, volume)) {
    return true;
  }

  await stopLoopingAudioInternal();

  const child = spawn("/bin/sh", ["-c", buildLoopShellCommand(filePath, volume)], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  if (child.pid) {
    await setAudioState({
      pid: child.pid,
      kind,
      filePath,
      volume,
    });
  }

  return true;
}

export async function playLoopingAudio(
  kind: AudioKind,
  config: PomodoroConfig,
  options?: SyncAudioOptions,
): Promise<boolean> {
  return withAudioLock(() => playLoopingAudioInternal(kind, config, options));
}

export async function playAlarm(config: PomodoroConfig): Promise<boolean> {
  const selection = resolveAlarmSelection(config);
  if (!selection.filePath) {
    return false;
  }

  const afplayVolume = volumePercentToAfplayArgument(config.alarmVolume);
  const child = spawn("afplay", ["-v", afplayVolume, selection.filePath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return true;
}

export async function playAlarmForSession(sessionId: string, config: PomodoroConfig): Promise<boolean> {
  const lastSessionId = await getLastAlarmSessionId();
  if (lastSessionId === sessionId) {
    return false;
  }

  const played = await playAlarm(config);
  if (played) {
    await setLastAlarmSessionId(sessionId);
  }

  return played;
}

export async function previewLoopingAudio(kind: AudioKind, config: PomodoroConfig, seconds = 5): Promise<boolean> {
  const selection = resolveLoopAudioSelection(kind, config);
  if (!selection.filePath) {
    return false;
  }

  const filePath = selection.filePath;
  const afplayVolume = volumePercentToAfplayArgument(resolveLoopVolume(kind, config));
  const command = `afplay -v ${afplayVolume} ${escapeShellArgument(filePath)} >/dev/null 2>&1 & pid=$!; sleep ${Math.max(
    1,
    Math.floor(seconds),
  )}; kill $pid >/dev/null 2>&1 || true`;

  const child = spawn("/bin/sh", ["-c", command], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return true;
}

export async function syncAudioForSession(
  session: PomodoroSession | null,
  config: PomodoroConfig,
  options?: SyncAudioOptions,
): Promise<void> {
  if (!session) {
    await stopLoopingAudio();
    return;
  }

  if (!options?.force && isWorkLogFormBlockingLoopAudio()) {
    await stopLoopingAudio();
    return;
  }

  if (session.status === "paused" || session.status === "awaiting_confirmation") {
    await stopLoopingAudio();
    return;
  }

  if (session.kind === "work") {
    await playLoopingAudio("work", config, options);
    return;
  }

  await playLoopingAudio("break", config, options);
}

export function describeAudioSelection(config: PomodoroConfig): {
  work: AudioSelection;
  break: AudioSelection;
  alarm: AudioSelection;
} {
  return {
    work: resolveLoopAudioSelection("work", config),
    break: resolveLoopAudioSelection("break", config),
    alarm: resolveAlarmSelection(config),
  };
}
