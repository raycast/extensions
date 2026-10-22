import { getPreferenceValues, LocalStorage } from '@raycast/api';
import { isPidAlive, launchHelperProcess, terminateHelperProcess } from './process';
import { CaffeineState, ExtensionPreferences } from './types';

const STORAGE_KEY = 'caffeine_state_v1';

export const DEFAULT_INACTIVE_STATE: CaffeineState = {
  active: false,
  durationSeconds: 0,
  preventDisplaySleep: true,
};

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
    if (typeof state.expiresAt === 'number' && state.expiresAt > 0) {
      if (Date.now() >= state.expiresAt) {
        if (state.pid) {
          terminateHelperProcess(state.pid);
        }
        await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INACTIVE_STATE));
        return DEFAULT_INACTIVE_STATE;
      }
    }

    // Process liveness check
    if (!state.pid || !isPidAlive(state.pid)) {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INACTIVE_STATE));
      return DEFAULT_INACTIVE_STATE;
    }

    return state;
  } catch {
    return DEFAULT_INACTIVE_STATE;
  }
}

/**
 * Starts or updates Caffeine.
 * durationSeconds = 0 means indefinite mode.
 * durationSeconds > 0 means timed mode.
 * Transitions seamlessly when already active without dropping into inactive state.
 */
export async function startCaffeine(
  durationSeconds: number,
  preventDisplaySleepOption?: boolean,
): Promise<CaffeineState> {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const shouldPreventDisplay =
    preventDisplaySleepOption !== undefined ? preventDisplaySleepOption : (prefs.preventDisplaySleep ?? true);

  // Capture existing PID before starting the new helper
  let oldPid: number | undefined;
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as CaffeineState;
      if (state.active && state.pid) {
        oldPid = state.pid;
      }
    }
  } catch {
    // Ignore error
  }

  // 1. Launch new helper process
  const pid = launchHelperProcess(durationSeconds, shouldPreventDisplay);
  const startedAt = Date.now();
  const expiresAt = durationSeconds > 0 ? startedAt + durationSeconds * 1000 : null;

  const newState: CaffeineState = {
    active: true,
    pid,
    startedAt,
    expiresAt,
    durationSeconds,
    preventDisplaySleep: shouldPreventDisplay,
  };

  // 2. Immediately update state so concurrent checks always see the alive new PID
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

  // 3. Cleanly terminate previous helper if one was running
  if (oldPid && oldPid !== pid) {
    try {
      terminateHelperProcess(oldPid);
    } catch {
      // Ignore error
    }
  }

  return newState;
}

/**
 * Stops Caffeine and restores Windows normal power management.
 */
export async function stopCaffeine(): Promise<CaffeineState> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as CaffeineState;
      if (state.pid) {
        terminateHelperProcess(state.pid);
      }
    }
  } catch {
    // Ignore error
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INACTIVE_STATE));
  return DEFAULT_INACTIVE_STATE;
}
