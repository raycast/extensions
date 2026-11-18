import { spawn, execFileSync, type ChildProcess } from "child_process";
import { environment } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";

// 跨进程共享的后台播放器 PID 文件：命令进程被回收后，
// 其他进程(重开命令 / 菜单栏)仍能据此找到并停止后台播放。
const PID_FILE = path.join(environment.supportPath, "audio-player.pid");

// 跨进程命令通道：任何进程向其追加命令行(PAUSE/RESUME/SEEK/RESTART)，
// 后台播放进程轮询读取 → 命令进程被回收后，切回来的命令仍能遥控播放。
const CMD_FILE = path.join(environment.supportPath, "audio-player.cmd");

// 跨进程状态通道：后台播放进程每 0.5s 写入 "<当前秒> <总秒> <PLAYING|PAUSED>"，
// 切回来的命令进程轮询它拿到实时进度与暂停态。
const STATUS_FILE = path.join(environment.supportPath, "audio-player.status");

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
// 发信号前确认进程身份（命令行含播放器二进制名），避免误杀无关进程。
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
  playerPath: string;
  onStatusChange: (status: PlaybackStatus) => void;
  onError: (message: string) => void;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
}

export interface AudioPlayerController {
  stop: () => void;
  cleanup: () => void;
}

/**
 * 与 swift/AudioPlayer.swift 约定的进程间通信协议。
 * 这是跨语言契约：修改任一端的字符串时，另一端必须同步更新。
 */
const PLAYER_PROTOCOL = {
  /** 子进程通过 stdout 输出，表示音频已开始播放。 */
  ready: "READY",
  /** 经命令文件收到，请求淡出并停止播放(实际停止统一用 SIGTERM)。 */
  stop: "STOP",
  /** 暂停 / 续播。 */
  pause: "PAUSE",
  resume: "RESUME",
  /** 跳回开头。 */
  restart: "SEEK0",
  /** 相对跳转前缀，其后跟秒数（可正负），如 "SEEK 5"。 */
  seekPrefix: "SEEK ",
  /** 子进程通过 stdout 输出播放进度，其后跟 "<当前秒> <总秒>"，如 "POS 12.3 210.5"。 */
  posPrefix: "POS ",
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

// 读后台播放进程写入的实时状态；文件缺失/格式不符时返回 null。
export function readPlayerStatus(): {
  positionSeconds: number;
  durationSeconds: number;
  paused: boolean;
} | null {
  try {
    const raw = fs.readFileSync(STATUS_FILE, "utf8").trim();
    if (!raw) {
      return null;
    }
    const [posText, durText, state] = raw.split(" ");
    const position = Number(posText);
    const duration = Number(durText);
    if (!Number.isFinite(position) || !Number.isFinite(duration)) {
      return null;
    }
    return { positionSeconds: position, durationSeconds: duration, paused: state === "PAUSED" };
  } catch {
    return null;
  }
}

let nextInstanceId = 1;

/**
 * 启动音频播放器，并管理其子进程生命周期。
 *
 * 调用者负责页面展示和状态保存。
 * 本模块负责进程启动、输出监听、停止和退出清理。
 */
export function startAudioPlayer(options: AudioPlayerOptions): AudioPlayerController {
  const { audioPath, id, playerPath, onStatusChange, onError, onProgress } = options;

  const instanceId = nextInstanceId++;
  const logPrefix = `[APM Audio Player][Instance ${instanceId}]`;

  let active = true;
  let child: ChildProcess | null = null;
  let stderrBuffer = "";
  let stdoutBuffer = "";
  let startTimer: ReturnType<typeof setTimeout> | null = null;

  console.log(`${logPrefix} MOUNT ${new Date().toISOString()}`);

  function reportError(message: string) {
    if (!active) {
      return;
    }

    onStatusChange("Failed");
    onError(message);
  }

  function startPlayer() {
    startTimer = null;

    if (!active) {
      return;
    }

    resetCommandFile();
    resetStatusFile();

    try {
      child = spawn(playerPath, [audioPath, CMD_FILE, STATUS_FILE], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: true, // 脱离父进程会话：命令被回收后仍继续播放
      });

      const player = child;
      player.unref(); // 不让子进程拖住父进程事件循环

      if (player.pid !== undefined) {
        writePidFile(player.pid, id);
      }

      console.log(
        `${logPrefix} SPAWN`,
        JSON.stringify({
          time: new Date().toISOString(),
          pid: player.pid,
        }),
      );

      player.stdout?.on("data", (data: Buffer) => {
        stdoutBuffer += data.toString();

        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === PLAYER_PROTOCOL.ready && active) {
            onStatusChange("Playing");
            continue;
          }

          if (trimmed.startsWith(PLAYER_PROTOCOL.posPrefix) && active) {
            const [posText, durText] = trimmed.slice(PLAYER_PROTOCOL.posPrefix.length).split(" ");
            const position = Number(posText);
            const duration = Number(durText);
            if (Number.isFinite(position) && Number.isFinite(duration)) {
              onProgress?.(position, duration);
            }
          }
        }
      });

      player.stderr?.on("data", (data: Buffer) => {
        const message = data.toString();
        stderrBuffer += message;

        console.log(`${logPrefix}[PID ${player.pid}] SWIFT`, message.trimEnd());
      });

      player.stdin?.on("error", () => {
        // 进程退出时，标准输入可能已经关闭。
      });

      player.on("error", (error) => {
        reportError(error.message);
      });

      player.on("close", (code, signal) => {
        console.log(
          `${logPrefix}[PID ${player.pid}] CLOSE`,
          JSON.stringify({
            time: new Date().toISOString(),
            code,
            signal,
          }),
        );

        if (child === player) {
          child = null;
        }

        clearPidFile(player.pid ?? undefined);

        if (!active) {
          return;
        }

        if (code !== 0) {
          reportError(stderrBuffer.trim() || `Player exited with code ${code}, signal ${signal ?? "none"}.`);
          return;
        }

        onStatusChange("Stopped");
      });
    } catch (error) {
      reportError(error instanceof Error ? error.message : String(error));
    }
  }

  function stop() {
    // 如果子进程尚未启动，取消延迟启动任务。
    if (startTimer !== null) {
      clearTimeout(startTimer);
      startTimer = null;
      active = false;

      onStatusChange("Stopped");
      return;
    }

    const player = child;

    if (!player || player.exitCode !== null || player.signalCode !== null) {
      onStatusChange("Stopped");
      return;
    }

    onStatusChange("Stopping");

    player.kill("SIGTERM"); // Swift 收到后淡出退出
  }

  function cleanup() {
    console.log(`${logPrefix} CLEANUP ${new Date().toISOString()}`);

    active = false;
    clearPidFile(child?.pid ?? undefined);

    if (startTimer !== null) {
      clearTimeout(startTimer);
      startTimer = null;
    }

    const player = child;
    child = null;

    if (player && player.exitCode === null && player.signalCode === null) {
      player.kill("SIGTERM"); // Swift 收到后淡出退出

      const forceKillTimer = setTimeout(() => {
        if (player.exitCode === null && player.signalCode === null) {
          player.kill("SIGKILL");
        }
      }, 1000);

      forceKillTimer.unref();
      player.once("close", () => clearTimeout(forceKillTimer));
    }
  }

  // 延迟启动，允许页面立即退出时取消启动任务。
  startTimer = setTimeout(startPlayer, 0);

  return {
    stop,
    cleanup,
  };
}
