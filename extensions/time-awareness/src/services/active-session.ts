import type { ActiveState } from "../types";
import { getIdleTimeSeconds } from "../utils/idle";
import { getParsedPreferences } from "../utils/preferences";
import { getActiveState, saveActiveState } from "../utils/storage";

export async function processActiveState(): Promise<ActiveState> {
  const { activeIntervalSeconds, idleThresholdSeconds } = getParsedPreferences();
  const state = await getActiveState();

  const currentIdleSeconds = await getIdleTimeSeconds();
  const isIdle = currentIdleSeconds > idleThresholdSeconds;
  const now = Date.now();

  if (isIdle) {
    state.accumulatedActiveSeconds = 0;
    state.lastCheckTime = now;
    state.isIdle = true;
    state.shouldNotify = false;

    await saveActiveState(state);
    return state;
  }

  const timeSinceLastCheck = Math.floor((now - state.lastCheckTime) / 1000); // Convert milliseconds to seconds

  // If time since last check is much larger than expected (e.g., laptop was closed),
  // treat it as if the user was idle the entire time
  if (timeSinceLastCheck > idleThresholdSeconds) {
    state.accumulatedActiveSeconds = 0;
    state.lastCheckTime = now;
    state.isIdle = false;
    state.shouldNotify = false;
    await saveActiveState(state);
    return state;
  }

  // Subtract idle time from active time to avoid counting breaks under the threshold
  const activeTimeToAdd = Math.max(0, timeSinceLastCheck - currentIdleSeconds);
  const previousMilestones = Math.floor(state.accumulatedActiveSeconds / activeIntervalSeconds);

  state.accumulatedActiveSeconds += activeTimeToAdd;
  state.lastCheckTime = now;
  state.isIdle = false;

  const currentMilestones = Math.floor(state.accumulatedActiveSeconds / activeIntervalSeconds);
  state.shouldNotify = currentMilestones > previousMilestones;

  if (state.shouldNotify) {
    state.sessionCount += 1;
  }

  await saveActiveState(state);
  return state;
}
