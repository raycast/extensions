import { LaunchType, launchCommand } from "@raycast/api";
import { ContrastContext, PickTarget } from "./types";

/** Opens "Check Contrast" with the given colors. */
export function openResult(context: ContrastContext) {
  return launchCommand({ name: "check-contrast", type: LaunchType.UserInitiated, context });
}

/**
 * Asks "Pick & Check Contrast" to pick one or both colors. The Raycast window must close while the
 * eyedropper is open, so the colors that are kept travel in the launch context and come back afterwards.
 */
export function pickAgain(pick: PickTarget, current: ContrastContext) {
  return launchCommand({
    name: "pick-and-check",
    type: LaunchType.UserInitiated,
    context: { ...current, pick } satisfies ContrastContext,
  });
}
