import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  startAudioPlayer,
  stopActivePlayer,
  getActivePlayer,
  commandPause,
  commandResume,
  commandSeek,
  commandRestart,
  readPlayerStatus,
} from "@/core/audio/audio-player";
import type { AudioPlayerController, PlaybackStatus } from "@/core/audio/audio-player";

interface UseAudioPlayerOptions {
  playerPath: string;
}

interface PlaybackCallbacks {
  onPlaying?: () => void;
  onError?: (message: string) => void;
}

// ---- 全局单例：整个扩展共享同一个播放器 ----
// 所有视图（Search Projects / Collection 等）通过本模块共享播放状态与进程，
// 保证同一时间只有一个 bounce 在播：切视图不打断，也不会重叠出声。

let playbackStatus: PlaybackStatus = "Stopped";
let playingId: string | null = null;
let positionSeconds = 0;
let durationSeconds = 0;
let activeController: AudioPlayerController | null = null;
let activeSessionId = 0;
// 切回来恢复的后台播放没有 stdout 管道，靠轮询状态文件拿实时进度。
let statusPoller: ReturnType<typeof setInterval> | null = null;
// 刚发过暂停/续播命令的时刻：命令有轮询延迟，这段时间内不让状态轮询回弹覆盖乐观态。
let lastCommandAt = 0;
// 播放器还没就绪时就按了暂停：就绪后补发一次（启动时会清空命令文件，先前那条可能被丢掉）。
let pendingPause = false;

// useSyncExternalStore 要求 getSnapshot 在未变化时返回稳定引用，这里缓存快照。
let snapshot: {
  playbackStatus: PlaybackStatus;
  playingId: string | null;
  positionSeconds: number;
  durationSeconds: number;
} = {
  playbackStatus,
  playingId,
  positionSeconds,
  durationSeconds,
};

const listeners = new Set<() => void>();

function emit() {
  snapshot = { playbackStatus, playingId, positionSeconds, durationSeconds };
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function setPlaybackStatus(status: PlaybackStatus) {
  if (playbackStatus !== status) {
    playbackStatus = status;
    emit();
  }
}

function setPlayingId(id: string | null) {
  if (playingId !== id) {
    playingId = id;
    emit();
  }
}

function setProgress(position: number, duration: number) {
  if (positionSeconds !== position || durationSeconds !== duration) {
    positionSeconds = position;
    durationSeconds = duration;
    emit();
  }
}

function play(id: string, audioPath: string, playerPath: string, callbacks?: PlaybackCallbacks) {
  // 先切换会话编号，使旧播放器的回调失效。
  const sessionId = ++activeSessionId;

  // 本进程接管为 owner，改由 stdout 驱动进度，停掉恢复用的状态轮询。
  stopStatusPoller();

  const previousController = activeController;
  activeController = null;

  // 清理旧播放器，避免多个播放器同时运行。
  previousController?.cleanup();

  // 本进程没有正在运行的播放器时，可能存在上一个命令进程遗留的后台播放，
  // 先按 PID 停掉，避免两段音频叠放。
  if (!previousController) {
    stopActivePlayer();
  }

  pendingPause = false;
  setPlaybackStatus("Starting");
  setPlayingId(id);
  setProgress(0, 0);

  const controller = startAudioPlayer({
    audioPath,
    id,
    playerPath,

    onProgress: (position, duration) => {
      // 只允许当前会话更新播放进度。
      if (activeSessionId !== sessionId) {
        return;
      }

      setProgress(position, duration);
    },

    onStatusChange: (status) => {
      // 只允许当前会话更新播放状态。
      if (activeSessionId !== sessionId) {
        return;
      }

      if (status === "Playing" && pendingPause) {
        pendingPause = false;
        lastCommandAt = Date.now();
        commandPause();
        setPlaybackStatus("Paused");
        return;
      }

      setPlaybackStatus(status);

      if (status === "Playing") {
        callbacks?.onPlaying?.();
      }

      if (status === "Stopped" || status === "Failed") {
        setPlayingId(null);
        setProgress(0, 0);

        if (activeController === controller) {
          activeController = null;
        }
      }
    },

    onError: (message) => {
      // 忽略已经被新会话取代的旧播放器错误。
      if (activeSessionId !== sessionId) {
        return;
      }

      callbacks?.onError?.(message);
    },
  });

  activeController = controller;
}

function stop() {
  pendingPause = false;
  if (!activeController) {
    stopStatusPoller();
    stopActivePlayer();
    if (playbackStatus !== "Stopped") {
      setPlaybackStatus("Stopped");
    }
    setPlayingId(null);
    setProgress(0, 0);
    return;
  }

  activeController.stop();
}

// 轮询状态文件：驱动恢复出来的后台播放的实时进度；进程已不在则收尾为 Stopped。
function startStatusPoller() {
  if (statusPoller) {
    return;
  }
  statusPoller = setInterval(() => {
    const info = getActivePlayer();
    if (!info) {
      stopStatusPoller();
      setProgress(0, 0);
      setPlayingId(null);
      setPlaybackStatus("Stopped");
      return;
    }
    const status = readPlayerStatus();
    if (!status) {
      return;
    }
    setProgress(status.positionSeconds, status.durationSeconds);
    if (Date.now() - lastCommandAt < 800) {
      return; // 命令在途，暂不按状态文件回弹 Playing/Paused
    }
    if (status.paused && playbackStatus === "Playing") {
      setPlaybackStatus("Paused");
    } else if (!status.paused && playbackStatus === "Paused") {
      setPlaybackStatus("Playing");
    }
  }, 500);
  statusPoller.unref?.();
}

function stopStatusPoller() {
  if (statusPoller) {
    clearInterval(statusPoller);
    statusPoller = null;
  }
}

// 本进程没在放，但后台(上一个命令进程遗留)仍在播时，恢复状态让 Toast 重新亮起。
// 暂停 / 快退快进 / Restart / Stop 经命令文件跨进程生效；实时进度经状态文件轮询补上。
function restoreFromBackground() {
  if (activeController) {
    return;
  }
  const info = getActivePlayer();
  if (!info) {
    return;
  }

  playingId = info.id;
  const status = readPlayerStatus();
  playbackStatus = status?.paused ? "Paused" : "Playing";
  positionSeconds = status?.positionSeconds ?? 0;
  durationSeconds = status?.durationSeconds ?? 0;
  emit();

  // 持续轮询状态文件，让进度条实时跳动。
  startStatusPoller();
}

function pause() {
  // 命令写入文件，后台播放进程轮询执行：切回命令后也能暂停。
  lastCommandAt = Date.now();
  commandPause();
  if (playbackStatus === "Starting") {
    pendingPause = true;
    setPlaybackStatus("Paused");
  } else if (playbackStatus === "Playing") {
    setPlaybackStatus("Paused");
  }
}

function resume() {
  lastCommandAt = Date.now();
  commandResume();
  pendingPause = false;
  if (playbackStatus === "Paused") {
    setPlaybackStatus("Playing");
  }
}

function seek(deltaSeconds: number) {
  commandSeek(deltaSeconds);
}

function restart() {
  commandRestart();
}

export function useAudioPlayer({ playerPath }: UseAudioPlayerOptions) {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  // 挂载时若后台仍有播放，恢复 Toast(见 restoreFromBackground 的降级说明)。
  useEffect(() => {
    restoreFromBackground();
  }, []);

  const playTrack = useCallback(
    (id: string, audioPath: string, callbacks?: PlaybackCallbacks) => {
      play(id, audioPath, playerPath, callbacks);
    },
    [playerPath],
  );

  const stopTrack = useCallback(() => stop(), []);
  const pauseTrack = useCallback(() => pause(), []);
  const resumeTrack = useCallback(() => resume(), []);
  const seekTrack = useCallback((deltaSeconds: number) => seek(deltaSeconds), []);
  const restartTrack = useCallback(() => restart(), []);

  return {
    playbackStatus: current.playbackStatus,
    playingId: current.playingId,
    positionSeconds: current.positionSeconds,
    durationSeconds: current.durationSeconds,
    play: playTrack,
    stop: stopTrack,
    pause: pauseTrack,
    resume: resumeTrack,
    seek: seekTrack,
    restart: restartTrack,
  };
}
