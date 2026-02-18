import { showHUD } from "@raycast/api";
import { stopCompletionSound } from "./sound-player";
import { hydrateTimerAfterLoad, loadTimerState, saveTimerState } from "./timer-core";
import { buildStartActionResult } from "./timer-command-actions";

export default async function Command() {
  await stopCompletionSound();
  const nowMs = Date.now();
  const storedState = await loadTimerState();
  const hydratedState = hydrateTimerAfterLoad(storedState, nowMs);
  const result = buildStartActionResult(hydratedState, nowMs);

  await saveTimerState(result.nextState);
  await showHUD(result.hudMessage);
}
