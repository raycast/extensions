import { DEFAULTS } from "../constants";
import type { ActiveState } from "../types";
import { getIdleTimeSeconds } from "../utils/idle";
import { getParsedPreferences } from "../utils/preferences";
import { getActiveState, saveActiveState } from "../utils/storage";

/**
 * Determines if the achievement should be displayed based on timestamp.
 */
function shouldShowAchievement(state: ActiveState): boolean {
  if (!state.achievementTimestamp) return false;
  return Date.now() - state.achievementTimestamp <= DEFAULTS.ACHIEVEMENT_DISPLAY_DURATION_MS;
}

/**
 * Calculates the next active state based on current state, idle time, and preferences.
 * This is a pure function that performs no side effects.
 *
 * @param currentState - The current active state
 * @param currentIdleSeconds - Current system idle time in seconds
 * @param activeIntervalSeconds - Target active interval in seconds
 * @param idleThresholdSeconds - Idle threshold in seconds
 * @returns The calculated next state
 */
export function calculateNextState(
  currentState: ActiveState,
  currentIdleSeconds: number,
  activeIntervalSeconds: number,
  idleThresholdSeconds: number,
): ActiveState {
  const now = Date.now();
  const isIdle = currentIdleSeconds > idleThresholdSeconds;

  if (isIdle) {
    return {
      ...currentState,
      accumulatedActiveSeconds: 0,
      lastCheckTime: now,
      isIdle: true,
      shouldNotify: false,
    };
  }

  const timeSinceLastCheck = Math.floor((now - currentState.lastCheckTime) / 1000);

  if (timeSinceLastCheck > idleThresholdSeconds) {
    return {
      ...currentState,
      accumulatedActiveSeconds: 0,
      lastCheckTime: now,
      isIdle: false,
      shouldNotify: false,
    };
  }

  const activeTimeToAdd = Math.max(0, timeSinceLastCheck - currentIdleSeconds);
  const previousMilestones = Math.floor(currentState.accumulatedActiveSeconds / activeIntervalSeconds);

  const newAccumulatedSeconds = currentState.accumulatedActiveSeconds + activeTimeToAdd;
  const currentMilestones = Math.floor(newAccumulatedSeconds / activeIntervalSeconds);
  const shouldNotify = currentMilestones > previousMilestones;

  const newState: ActiveState = {
    ...currentState,
    accumulatedActiveSeconds: newAccumulatedSeconds,
    lastCheckTime: now,
    isIdle: false,
    shouldNotify,
  };

  if (shouldNotify) {
    newState.sessionCount = currentState.sessionCount + 1;
    newState.achievementTimestamp = now;
  }

  if (!shouldShowAchievement(newState)) {
    newState.achievementTimestamp = undefined;
  }

  return newState;
}

/**
 * Processes the active state by calculating the next state and persisting it.
 * This function has side effects (reads idle time, reads/writes storage).
 */
export async function processActiveState(): Promise<ActiveState> {
  const { activeIntervalSeconds, idleThresholdSeconds } = getParsedPreferences();
  const state = await getActiveState();
  const currentIdleSeconds = await getIdleTimeSeconds();

  const newState = calculateNextState(state, currentIdleSeconds, activeIntervalSeconds, idleThresholdSeconds);

  await saveActiveState(newState);
  return newState;
}
