import { getSelectedText, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { LLMRequest, Mode } from "./llm-view";

// Runs as a no-view command. Input: text typed as the command argument in Raycast, otherwise the
// current selection (grabbed while the source app is still focused). Then opens the result view,
// so each run starts a fresh request; with no input at all it opens an input form instead.
export async function launchWithSelection(mode: Mode, typed?: string, extra: Partial<LLMRequest> = {}) {
  const startedAt = Date.now();
  const text = typed?.trim() || (await getSelectedText().catch(() => "")).trim();
  // Nothing typed or selected: open the result command with an empty text, which shows an input form.
  const context: LLMRequest = { ...extra, mode, text, startedAt };
  try {
    await launchCommand({ name: "home", type: LaunchType.UserInitiated, context });
  } catch (error) {
    // The AI Buddy command is disabled in Raycast Settings, so there is nowhere to show the result.
    await showFailureToast(error, {
      title: "Could not open AI Buddy",
      message: "Enable the AI Buddy command in Raycast Settings.",
    });
  }
}

/**
 * Runs Buddy Draft Reply on this text through its own command (as its hotkey does), so its command
 * settings such as Reply Language apply. Used from AI Buddy and Continue with.
 */
export async function runDraftReply(text: string) {
  try {
    await launchCommand({ name: "reply", type: LaunchType.UserInitiated, arguments: { text } });
  } catch (error) {
    await showFailureToast(error, {
      title: "Could not open Buddy Draft Reply",
      message: "Enable the Buddy Draft Reply command in Raycast Settings.",
    });
  }
}
