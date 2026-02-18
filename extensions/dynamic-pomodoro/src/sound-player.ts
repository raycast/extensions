import type { LaunchType } from "@raycast/api";
import { execFile } from "node:child_process";
import { shouldPlaySound, type SoundMode } from "./sound-policy.ts";

export type CompletionSoundSource = "custom" | "beep" | "none";

export type CompletionSoundResult = {
  attempted: boolean;
  attemptedAt?: number;
  mode: SoundMode;
  source: CompletionSoundSource;
  played: boolean;
  error?: string;
};

type PlayCompletionSoundDeps = {
  now: () => number;
  playCustomSound: (
    path: string,
    maxDurationSeconds?: number,
    onStart?: (pid: number) => Promise<void> | void,
  ) => Promise<void>;
  playBeep: () => Promise<void>;
  setCompletionSoundPid: (pid: number) => Promise<void>;
  clearCompletionSoundPid: () => Promise<void>;
};

const defaultDeps: PlayCompletionSoundDeps = {
  now: () => Date.now(),
  playCustomSound,
  playBeep,
  setCompletionSoundPid: setStoredCompletionSoundPid,
  clearCompletionSoundPid: clearStoredCompletionSoundPid,
};

const COMPLETION_SOUND_PID_KEY = "timer-completion-sound-pid-v1";

type ExecFileResult = {
  pid?: number;
  completed: Promise<void>;
};

function execFilePromise(file: string, args: string[]): ExecFileResult {
  let resolvePromise: () => void;
  let rejectPromise: (error: Error) => void;

  const completed = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const child = execFile(file, args, (error: Error | null) => {
    if (error) {
      rejectPromise(error);
      return;
    }
    resolvePromise();
  });

  return { pid: child.pid ?? undefined, completed };
}

async function getLocalStorage() {
  const { LocalStorage } = await import("@raycast/api");
  return LocalStorage;
}

async function setStoredCompletionSoundPid(pid: number): Promise<void> {
  const LocalStorage = await getLocalStorage();
  await LocalStorage.setItem(COMPLETION_SOUND_PID_KEY, pid);
}

async function getStoredCompletionSoundPid(): Promise<number | null> {
  const LocalStorage = await getLocalStorage();
  const value = await LocalStorage.getItem<number | string>(COMPLETION_SOUND_PID_KEY);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function clearStoredCompletionSoundPid(): Promise<void> {
  const LocalStorage = await getLocalStorage();
  await LocalStorage.removeItem(COMPLETION_SOUND_PID_KEY);
}

export async function playCustomSound(
  path: string,
  maxDurationSeconds?: number,
  onStart?: (pid: number) => Promise<void> | void,
): Promise<void> {
  const args = maxDurationSeconds && maxDurationSeconds > 0 ? ["-t", String(maxDurationSeconds), path] : [path];
  const { pid, completed } = execFilePromise("/usr/bin/afplay", args);

  if (pid && onStart) {
    try {
      await onStart(pid);
    } catch {
      // ignore PID storage failures
    }
  }

  await completed;
}

export async function playBeep(): Promise<void> {
  const { completed } = execFilePromise("/usr/bin/osascript", ["-e", "beep"]);
  await completed;
}

type StopCompletionSoundDeps = {
  getCompletionSoundPid: () => Promise<number | null>;
  clearCompletionSoundPid: () => Promise<void>;
  killProcess: (pid: number) => void;
};

const defaultStopDeps: StopCompletionSoundDeps = {
  getCompletionSoundPid: getStoredCompletionSoundPid,
  clearCompletionSoundPid: clearStoredCompletionSoundPid,
  killProcess: (pid: number) => {
    process.kill(pid);
  },
};

export async function stopCompletionSound(deps: Partial<StopCompletionSoundDeps> = {}): Promise<void> {
  const mergedDeps: StopCompletionSoundDeps = {
    ...defaultStopDeps,
    ...deps,
  };

  const pid = await mergedDeps.getCompletionSoundPid();

  if (!pid) {
    return;
  }

  try {
    mergedDeps.killProcess(pid);
  } catch {
    // ignore missing process
  } finally {
    await mergedDeps.clearCompletionSoundPid();
  }
}

export async function playCompletionSound(
  {
    mode,
    launchType,
    customPath,
    maxDurationSeconds,
  }: {
    mode: SoundMode;
    launchType: LaunchType | string | undefined;
    customPath?: string;
    maxDurationSeconds?: number;
  },
  deps: Partial<PlayCompletionSoundDeps> = {},
): Promise<CompletionSoundResult> {
  const mergedDeps: PlayCompletionSoundDeps = {
    ...defaultDeps,
    ...deps,
  };

  if (!shouldPlaySound({ soundMode: mode, launchType })) {
    return {
      attempted: false,
      mode,
      source: "none",
      played: false,
    };
  }

  const attemptedAt = mergedDeps.now();
  const normalizedPath = customPath?.trim();

  if (normalizedPath) {
    let storedPid: number | undefined;

    try {
      await mergedDeps.playCustomSound(normalizedPath, maxDurationSeconds, async (pid) => {
        storedPid = pid;
        await mergedDeps.setCompletionSoundPid(pid);
      });
      return {
        attempted: true,
        attemptedAt,
        mode,
        source: "custom",
        played: true,
      };
    } catch (error) {
      const customError = String(error);
      try {
        await mergedDeps.playBeep();
      } catch (beepError) {
        return {
          attempted: true,
          attemptedAt,
          mode,
          source: "beep",
          played: false,
          error: `${customError}; fallback failed: ${String(beepError)}`,
        };
      }

      return {
        attempted: true,
        attemptedAt,
        mode,
        source: "beep",
        played: true,
        error: customError,
      };
    } finally {
      if (storedPid) {
        await mergedDeps.clearCompletionSoundPid();
      }
    }
  }

  try {
    await mergedDeps.playBeep();
    return {
      attempted: true,
      attemptedAt,
      mode,
      source: "beep",
      played: true,
    };
  } catch (error) {
    return {
      attempted: true,
      attemptedAt,
      mode,
      source: "beep",
      played: false,
      error: String(error),
    };
  }
}
