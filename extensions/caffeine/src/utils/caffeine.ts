import { getPreferenceValues, LocalStorage } from "@raycast/api";
import fs from "fs";
import path from "path";
import { getStateDirectory, isPidAlive, launchHelperProcess, terminateHelperProcess } from "./process";
import { CaffeineState } from "./types";

const STORAGE_KEY = "caffeine_state_v1";

export const DEFAULT_INACTIVE_STATE: CaffeineState = {
  active: false,
  durationSeconds: 0,
  preventDisplaySleep: true,
};

// In-process lock queue to serialize asynchronous operations within the same command instance
let localQueue: Promise<unknown> = Promise.resolve();

function withLocalLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = localQueue.then(fn, fn);
  localQueue = result.then(
    () => {},
    () => {},
  );
  return result;
}

// Cross-command file lock to serialize state changes across both Caffeine and Caffeine-Tray commands
async function acquireFileLock(maxWaitMs = 10000): Promise<() => Promise<void>> {
  const lockFile = path.join(getStateDirectory(), "caffeine.lock");
  const start = Date.now();
  let fd: number | null = null;

  while (Date.now() - start < maxWaitMs) {
    try {
      fd = fs.openSync(lockFile, "wx");
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, time: Date.now() }));
      break;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        try {
          const stats = fs.statSync(lockFile);
          if (Date.now() - stats.mtimeMs > 8000) {
            try {
              fs.unlinkSync(lockFile);
            } catch {
              // Ignore unlink error
            }
          }
        } catch {
          // Ignore stat error
        }
        await new Promise((r) => setTimeout(r, 40));
      } else {
        throw err;
      }
    }
  }

  if (fd === null) {
    throw new Error("Timed out waiting to acquire Caffeine state lock.");
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    try {
      if (fd !== null) {
        fs.closeSync(fd);
      }
    } catch {
      // Ignore close error
    }
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // Ignore unlink error
    }
  };
}

export async function withSerializedState<T>(fn: () => Promise<T>): Promise<T> {
  return withLocalLock(async () => {
    const release = await acquireFileLock();
    try {
      return await fn();
    } finally {
      await release();
    }
  });
}

/**
 * Reconciles stored state with actual Windows helper process state and timer expiration.
 */
export async function getCurrentState(): Promise<CaffeineState> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_INACTIVE_STATE;
    }

    const state = JSON.parse(raw) as CaffeineState;

    if (!state.active) {
      return DEFAULT_INACTIVE_STATE;
    }

    // Timer expiration check
    if (typeof state.expiresAt === "number" && state.expiresAt > 0) {
      if (Date.now() >= state.expiresAt) {
        return await stopCaffeine();
      }
    }

    // Process liveness check (fast, non-blocking check via helper status file & process signal)
    if (!state.pid || !isPidAlive(state.pid, state.processStartTime, state.statusFilePath)) {
      return await withSerializedState(async () => {
        // Re-read under lock to avoid race conditions with a newly started helper
        const latestRaw = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (latestRaw) {
          const latestState = JSON.parse(latestRaw) as CaffeineState;
          if (latestState.pid === state.pid) {
            await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INACTIVE_STATE));
          }
        }
        return DEFAULT_INACTIVE_STATE;
      });
    }

    return state;
  } catch {
    return DEFAULT_INACTIVE_STATE;
  }
}

/**
 * Starts or updates Caffeine.
 * Serialized across overlapping calls and commands to prevent orphaned helpers.
 * Waits for ready signal before terminating old helper and marking active.
 */
export async function startCaffeine(
  durationSeconds: number,
  preventDisplaySleepOption?: boolean,
): Promise<CaffeineState> {
  return withSerializedState(async () => {
    const prefs = getPreferenceValues<Preferences>();
    const shouldPreventDisplay =
      preventDisplaySleepOption !== undefined ? preventDisplaySleepOption : (prefs.preventDisplaySleep ?? true);

    // Capture existing running helper details before starting replacement
    let oldPid: number | undefined;
    let oldStartTime: number | undefined;
    let oldStatusPath: string | undefined;

    try {
      const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as CaffeineState;
        if (state.active && state.pid) {
          oldPid = state.pid;
          oldStartTime = state.processStartTime;
          oldStatusPath = state.statusFilePath;
        }
      }
    } catch {
      // Ignore read error
    }

    // 1. Launch new helper and wait for confirmed ready signal (throws if fails)
    const { pid, processStartTime, statusFilePath } = await launchHelperProcess(durationSeconds, shouldPreventDisplay);

    const startedAt = Date.now();
    const expiresAt = durationSeconds > 0 ? startedAt + durationSeconds * 1000 : null;

    const newState: CaffeineState = {
      active: true,
      pid,
      processStartTime,
      statusFilePath,
      startedAt,
      expiresAt,
      durationSeconds,
      preventDisplaySleep: shouldPreventDisplay,
    };

    // 2. Update state under lock
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

    // 3. Cleanly terminate previous helper if one was running
    if (oldPid && oldPid !== pid) {
      try {
        await terminateHelperProcess(oldPid, oldStartTime, oldStatusPath);
      } catch {
        // Ignore error
      }
    }

    return newState;
  });
}

/**
 * Stops Caffeine and restores Windows normal power management.
 * Serialized to ensure all processes and state are cleanly reconciled.
 */
export async function stopCaffeine(): Promise<CaffeineState> {
  return withSerializedState(async () => {
    try {
      const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as CaffeineState;
        if (state.pid) {
          await terminateHelperProcess(state.pid, state.processStartTime, state.statusFilePath);
        }
      }
    } catch {
      // Ignore read error
    }

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INACTIVE_STATE));
    return DEFAULT_INACTIVE_STATE;
  });
}
