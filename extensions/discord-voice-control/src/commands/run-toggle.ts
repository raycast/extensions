import { toggleVoice } from "../application/toggle-voice";
import { createShortcutController } from "../infrastructure/discord-control";
import { getPreferences } from "../infrastructure/system/preferences";
import type { VoiceAction } from "../domain/types";
import { presentResult } from "../shared/feedback";

/**
 * Thin entry shared by the two no-view toggle commands. Keeps command files trivial: wire the
 * production controller, run the use case, present feedback. No automation logic lives here.
 */
export async function runToggle(action: VoiceAction): Promise<void> {
  const prefs = getPreferences();
  const result = await toggleVoice(action, {
    controller: createShortcutController(),
    diagnosticLogging: prefs.diagnosticLogging,
  });
  await presentResult(result);
}
