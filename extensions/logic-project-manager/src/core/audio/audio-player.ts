import { execFileSync } from "node:child_process";
import { environment } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { LOG_PREFIX } from "@/core/log";
import { missingProcessOutcome, pollIntervalMs } from "./player-poll";

// 跨进程共享的后台播放器 PID 文件：命令进程被回收后，
// 其他进程(重开命令 / 菜单栏)仍能据此找到并停止后台播放。
const PID_FILE = path.join(environment.supportPath, "audio-player.pid");

// 跨进程命令通道：任何进程向其追加命令行(PAUSE/RESUME/SEEK/RESTART)，
// 后台播放进程轮询读取 → 命令进程被回收后，切回来的命令仍能遥控播放。
const CMD_FILE = path.join(environment.supportPath, "audio-player.cmd");

// 跨进程状态通道：后台播放进程每 0.5s 写入 "<当前秒> <总秒> <PLAYING|PAUSED>"，
// 失败时写入 "FAILED <错误信息>"。worker 的 stdout 已接空，进度和失败原因都只走这个文件。
const STATUS_FILE = path.join(environment.supportPath, "audio-player.status");

// 轮询状态文件的间隔：worker 每 0.5s 写一次，这里比它密一些，好尽快拿到第一行状态。
const STATUS_POLL_INTERVAL_MS = 200;

// 启动后的轮询间隔：worker 起来后要过一会儿才写第一行状态，用更密的间隔读，
// 0:00 才不会比声音晚出现。读到第一行状态后换回 STATUS_POLL_INTERVAL_MS。
const STARTUP_POLL_INTERVAL_MS = 40;

// 启动宽限期：进程已经不在、又没写过任何状态时，等这么久再报失败，
// 让 worker 退出前写下的 FAILED 行有机会被读到。
const START_GRACE_MS = 5000;

function readPidFile(): { pid: number; id: string; startedAt: number } | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(PID_FILE, "utf8"));
    return typeof parsed?.pid === "number" && typeof parsed?.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writePidFile(pid: number, id: string): void {
  try {
    fs.writeFileSync(PID_FILE, JSON.stringify({ pid, id, startedAt: Date.now() }));
  } catch {
    // 忽略写入失败
  }
}

// 已确认过身份的播放器 PID：状态轮询每 0.5s 调一次 getActivePlayer，同一个 PID 只用 ps 查一次。
let verifiedPid: number | null = null;

// 查当前后台播放：返回仍存活、且确实是我们播放器的 { pid, id }，否则 null（并清理残留记录）。
// 只探活不够：播放器自然结束后 PID 文件没人清理，这个 PID 若被别的进程复用，会显示一个永远“播放中”的状态。
export function getActivePlayer(): { pid: number; id: string } | null {
  const info = readPidFile();
  if (!info) {
    return null;
  }
  try {
    process.kill(info.pid, 0); // 探活
  } catch {
    verifiedPid = null;
    clearPidFile();
    return null;
  }
  if (verifiedPid !== info.pid) {
    if (!isOurPlayerProcess(info.pid)) {
      clearPidFile();
      return null;
    }
    verifiedPid = info.pid;
  }
  return { pid: info.pid, id: info.id };
}

function clearPidFile(pid?: number): void {
  try {
    if (pid !== undefined && readPidFile()?.pid !== pid) {
      return; // 不是自己写的记录，别清
    }
    fs.rmSync(PID_FILE, { force: true });
  } catch {
    // 忽略
  }
}

// 校验某 pid 当前确实是我们的播放器进程：PID 可能被系统复用，
// 发信号前确认进程身份（命令行含播放器可执行文件名），避免误杀无关进程。
function isOurPlayerProcess(pid: number): boolean {
  try {
    const command = execFileSync("/bin/ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
      timeout: 1000,
    });
    return command.includes("audio-player");
  } catch {
    return false;
  }
}

// 停掉当前后台播放(若有)。返回是否确有在跑的进程被通知停止。
export function stopActivePlayer(): boolean {
  const info = readPidFile();
  if (!info) {
    return false;
  }
  try {
    process.kill(info.pid, 0); // 探活
  } catch {
    clearPidFile(); // 僵尸记录，清掉
    return false;
  }
  // PID 可能被复用，确认是我们的播放器才发信号。
  if (!isOurPlayerProcess(info.pid)) {
    clearPidFile();
    return false;
  }
  try {
    process.kill(info.pid, "SIGTERM"); // Swift 端收到后淡出退出
  } catch {
    // 忽略
  }
  clearPidFile(info.pid);
  return true;
}

export type PlaybackStatus = "Starting" | "Playing" | "Paused" | "Stopping" | "Stopped" | "Failed";

export interface AudioPlayerOptions {
  audioPath: string;
  id: string;
  onStatusChange: (status: PlaybackStatus) => void;
  onError: (message: string) => void;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
}

export interface AudioPlayerController {
  stop: () => void;
  cleanup: () => void;
}

/**
 * 与 swift/audio-player/Sources/AudioPlayer.swift 约定的进程间通信协议。
 * 这是跨语言契约：修改任一端的字符串时，另一端必须同步更新。
 */
const PLAYER_PROTOCOL = {
  /** 经命令文件收到，请求淡出并停止播放(实际停止统一用 SIGTERM)。 */
  stop: "STOP",
  /** 暂停 / 续播。 */
  pause: "PAUSE",
  resume: "RESUME",
  /** 跳回开头。 */
  restart: "SEEK0",
  /** 相对跳转前缀，其后跟秒数（可正负），如 "SEEK 5"。 */
  seekPrefix: "SEEK ",
  /** 经状态文件写出，其后跟错误信息，如 "FAILED Failed to load audio: …"。 */
  failedPrefix: "FAILED ",
} as const;

// 开新播放前清空命令文件，丢弃上一轮播放的残留命令。
function resetCommandFile(): void {
  try {
    fs.writeFileSync(CMD_FILE, "");
  } catch {
    // 忽略
  }
}

// 向命令文件追加一行命令。本命令进程与切回来的命令进程共用这一通道，
// 后台播放进程轮询读取后执行。
function appendCommand(line: string): void {
  try {
    fs.appendFileSync(CMD_FILE, `${line}\n`);
  } catch {
    // 忽略
  }
}

// 跨进程遥控：无论本进程是否持有播放器句柄，都能通过命令文件控制后台播放。
export function commandPause(): void {
  appendCommand(PLAYER_PROTOCOL.pause);
}

export function commandResume(): void {
  appendCommand(PLAYER_PROTOCOL.resume);
}

export function commandSeek(deltaSeconds: number): void {
  appendCommand(`${PLAYER_PROTOCOL.seekPrefix}${deltaSeconds}`);
}

export function commandRestart(): void {
  appendCommand(PLAYER_PROTOCOL.restart);
}

// 开新播放前清空状态文件，避免切回来时读到上一轮的残留进度。
function resetStatusFile(): void {
  try {
    fs.writeFileSync(STATUS_FILE, "");
  } catch {
    // 忽略
  }
}

type StatusLine =
  | { kind: "status"; positionSeconds: number; durationSeconds: number; paused: boolean }
  | { kind: "failed"; message: string };

// 读后台播放进程写入的状态文件；文件缺失 / 格式不符时返回 null。
function readStatusLine(): StatusLine | null {
  try {
    const raw = fs.readFileSync(STATUS_FILE, "utf8").trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith(PLAYER_PROTOCOL.failedPrefix)) {
      return { kind: "failed", message: raw.slice(PLAYER_PROTOCOL.failedPrefix.length).trim() };
    }
    const [posText, durText, state] = raw.split(" ");
    const position = Number(posText);
    const duration = Number(durText);
    if (!Number.isFinite(position) || !Number.isFinite(duration)) {
      return null;
    }
    return { kind: "status", positionSeconds: position, durationSeconds: duration, paused: state === "PAUSED" };
  } catch {
    return null;
  }
}

// 读后台播放进程写入的实时状态；文件缺失 / 格式不符 / 写的是失败信息时返回 null。
export function readPlayerStatus(): {
  positionSeconds: number;
  durationSeconds: number;
  paused: boolean;
} | null {
  const line = readStatusLine();
  if (!line || line.kind !== "status") {
    return null;
  }
  return { positionSeconds: line.positionSeconds, durationSeconds: line.durationSeconds, paused: line.paused };
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

let nextInstanceId = 1;

/**
 * 启动音频播放器，并管理其后台进程生命周期。
 *
 * 调用者负责页面展示和状态保存。
 * 本模块负责进程启动、状态轮询、停止和退出清理。
 */
export function startAudioPlayer(options: AudioPlayerOptions): AudioPlayerController {
  const { audioPath, id, onStatusChange, onError, onProgress } = options;

  const instanceId = nextInstanceId++;
  const logPrefix = `${LOG_PREFIX}[Audio Player][Instance ${instanceId}]`;

  let active = true;
  let pid: number | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  let startedAt = 0;
  // 是否读到过第一行有效状态：读到过就说明播放真的开始了，之后进程消失是正常播完。
  let sawStatus = false;
  // 用户是否按过停止：按过之后进程消失是正常停止，不是启动失败。
  let stopRequested = false;

  console.log(`${logPrefix} MOUNT ${new Date().toISOString()}`);

  function reportError(message: string) {
    if (!active) {
      return;
    }

    onStatusChange("Failed");
    onError(message);
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // 启动阶段用更密的间隔，读到第一行状态后换回常规间隔。
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(poll, pollIntervalMs(sawStatus, STARTUP_POLL_INTERVAL_MS, STATUS_POLL_INTERVAL_MS));
    pollTimer.unref?.();
  }

  // 确认身份后发 SIGTERM 让 worker 淡出退出，1 秒后还在就 SIGKILL。
  // 返回是否真的发出了信号。
  function killPlayer(target: number): boolean {
    if (!isOurPlayerProcess(target)) {
      return false;
    }
    try {
      process.kill(target, "SIGTERM");
    } catch {
      return false;
    }

    const forceKillTimer = setTimeout(() => {
      if (isProcessAlive(target)) {
        try {
          process.kill(target, "SIGKILL");
        } catch {
          // 忽略
        }
      }
    }, 1000);
    forceKillTimer.unref();

    return true;
  }

  function poll() {
    if (!active || pid === null) {
      return;
    }

    const line = readStatusLine();

    if (line?.kind === "failed") {
      stopPolling();
      clearPidFile(pid);
      reportError(line.message);
      return;
    }

    // 已经按了停止就不再理会状态行：worker 可能刚好在退出前写下了最后一行，
    // 报成 Playing 或把进度推回去都不对。
    if (line?.kind === "status" && !stopRequested) {
      if (!sawStatus) {
        sawStatus = true;
        onStatusChange("Playing");
        startPolling();
      }
      onProgress?.(line.positionSeconds, line.durationSeconds);
    }

    if (isProcessAlive(pid)) {
      return;
    }

    const outcome = missingProcessOutcome({
      sawStatus,
      stopRequested,
      elapsedMs: Date.now() - startedAt,
      graceMs: START_GRACE_MS,
    });
    if (outcome === "wait") {
      return;
    }

    stopPolling();
    clearPidFile(pid);
    if (outcome === "stopped") {
      onStatusChange("Stopped");
    } else {
      reportError("The player stopped before it started playing.");
    }
  }

  async function start() {
    startTimer = null;

    if (!active) {
      return;
    }

    resetCommandFile();
    resetStatusFile();

    try {
      const { startPlayer } = await import("swift:../../../swift/audio-player");
      const workerPid = await startPlayer(audioPath, CMD_FILE, STATUS_FILE);

      if (!active) {
        // 页面在启动过程中退出：把刚起来的 worker 停掉。
        killPlayer(workerPid);
        return;
      }

      pid = workerPid;
      startedAt = Date.now();
      writePidFile(workerPid, id);

      console.log(
        `${logPrefix} SPAWN`,
        JSON.stringify({
          time: new Date().toISOString(),
          pid: workerPid,
        }),
      );

      startPolling();
      // 立刻读一次：worker 可能已经写好第一行状态，不必等满一个间隔。
      poll();
    } catch (error) {
      reportError(error instanceof Error ? error.message : String(error));
    }
  }

  function stop() {
    // 如果 worker 尚未启动，取消延迟启动任务。
    if (startTimer !== null) {
      clearTimeout(startTimer);
      startTimer = null;
      active = false;

      onStatusChange("Stopped");
      return;
    }

    if (pid === null) {
      // 启动还在进行（startPlayer 尚未返回）：标记失效，让 start 拿到 pid 后立刻停掉 worker。
      active = false;
      onStatusChange("Stopped");
      return;
    }

    onStatusChange("Stopping");
    stopRequested = true;

    // 发信号后继续轮询：进程消失时由 poll 收尾成 Stopped。
    if (!killPlayer(pid)) {
      stopPolling();
      clearPidFile(pid);
      onStatusChange("Stopped");
    }
  }

  function cleanup() {
    console.log(`${logPrefix} CLEANUP ${new Date().toISOString()}`);

    active = false;
    stopPolling();

    if (startTimer !== null) {
      clearTimeout(startTimer);
      startTimer = null;
    }

    if (pid !== null) {
      killPlayer(pid);
      clearPidFile(pid);
    }
  }

  // 延迟启动，允许页面立即退出时取消启动任务。
  startTimer = setTimeout(start, 0);

  return {
    stop,
    cleanup,
  };
}
