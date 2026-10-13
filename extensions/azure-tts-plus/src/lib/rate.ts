import { showHUD } from "@raycast/api";
import { hostEnv } from "./host.js";
import { applyRateDelta } from "./reading.js";
import { logFailure } from "./state.js";

/** The command-palette door to a speed change. The keyboard door is `worker.ts`. */
export const nudgeRate = async (direction: 1 | -1) => {
  const arrow = direction > 0 ? "»" : "«";
  const outcome = await applyRateDelta(hostEnv(), direction);
  if (outcome.kind === "limit") {
    await showHUD(`${arrow} ${outcome.rate.toFixed(1)}x is the limit`);
    return;
  }
  if (outcome.kind === "failed") {
    logFailure("rate", outcome.message);
    await showHUD(`Could not change speed: ${outcome.message}`);
    return;
  }
  await showHUD(`${arrow} ${outcome.rate.toFixed(1)}x`);
};
