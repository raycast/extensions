import { Toast, showHUD, showToast } from "@raycast/api";
import type { OutcomeStatus, VoiceControlResult } from "../domain/types";

/**
 * Maps a {@link VoiceControlResult} to Raycast user feedback for the no-view toggle commands.
 *
 * - A best-effort `success` uses an unobtrusive HUD (the command closes), matching the "fast toggle"
 *   intent. The wording comes from the catalog, so it always says what was *sent*.
 * - Every other outcome uses a Toast with a style that signals the outcome, plus the catalog message
 *   as the next-step explanation.
 */

const TOAST_STYLE_FOR_OUTCOME: Record<Exclude<OutcomeStatus, "success">, Toast.Style> = {
  unavailable: Toast.Style.Failure,
  failed: Toast.Style.Failure,
  unknown: Toast.Style.Failure,
};

const TOAST_TITLE_FOR_OUTCOME: Record<Exclude<OutcomeStatus, "success">, string> = {
  unavailable: "Action unavailable",
  failed: "Action failed",
  unknown: "Result unclear",
};

/** Show feedback for a no-view command result. Resolves once the feedback has been presented. */
export async function presentResult(result: VoiceControlResult): Promise<void> {
  if (result.outcome === "success") {
    await showHUD(result.message);
    return;
  }

  await showToast({
    style: TOAST_STYLE_FOR_OUTCOME[result.outcome],
    title: TOAST_TITLE_FOR_OUTCOME[result.outcome],
    message: result.message,
  });
}
