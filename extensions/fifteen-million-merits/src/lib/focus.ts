import { getPreferenceValues, open } from "@raycast/api";
import { getDistractionThreshold } from "./preferences";
import { getAgentsCounter, getPreviousAgentsCounter, setPreviousAgentsCounter } from "./state";

/**
 * Starts the focus mode.
 */
export function startFocusMode(): void {
  const { focusGoal, focusCategories } = getPreferenceValues<Preferences>();
  const encodedGoal = encodeURIComponent(focusGoal);
  const encodedCategories = encodeURIComponent(focusCategories);
  const focusUrl = `raycast://focus/start?goal=${encodedGoal}&categories=${encodedCategories}`;
  open(focusUrl);
}

/**
 * Completes the focus mode.
 */
export function completeFocusMode(): void {
  const focusUrl = `raycast://focus/complete`;
  open(focusUrl);
}

/**
 * Evaluates the focus mode based on the agents counter and distraction threshold.
 */
export function evaluateFocusMode(): void {
  const threshold = getDistractionThreshold();
  const agentsCounter = getAgentsCounter();
  if (agentsCounter >= threshold) {
    completeFocusMode();
  } else {
    startFocusMode();
  }
}

/**
 * Checks for changes in the agents counter and evaluates focus mode if changed.
 */
export async function checkAndEvaluateFocus(): Promise<void> {
  const current = getAgentsCounter();
  const previous = await getPreviousAgentsCounter();

  if (previous === null || current !== previous) {
    await setPreviousAgentsCounter(current);
    evaluateFocusMode();
  }
}
