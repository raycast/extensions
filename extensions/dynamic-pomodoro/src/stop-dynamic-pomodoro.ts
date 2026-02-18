import { showHUD } from "@raycast/api";
import { stopCompletionSound } from "./sound-player";
import { hydrateTimerAfterLoad, loadTimerState, saveTimerState } from "./timer-core";
import { buildStopActionResult } from "./timer-command-actions";

export default async function Command() {
  await stopCompletionSound();
  const storedState = await loadTimerState();
  const hydratedState = hydrateTimerAfterLoad(storedState, Date.now());
  const result = buildStopActionResult(hydratedState);

  await saveTimerState(result.nextState);
  await showHUD(result.hudMessage);
}
