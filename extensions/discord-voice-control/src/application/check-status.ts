import { checkAccessibility } from "../infrastructure/system/permission-probe";
import { isDiscordInstalled, isDiscordRunning } from "../infrastructure/system/discord-probe";
import { getPreferences } from "../infrastructure/system/preferences";
import { evaluateStatus, type StatusEvaluation } from "./evaluate-status";

/**
 * Status use case (Phase 3): gather capability facts via the system probes, then delegate the
 * decision to the pure {@link evaluateStatus}. The view binds to the returned {@link StatusEvaluation}.
 */
export async function checkVoiceControlStatus(): Promise<StatusEvaluation> {
  const prefs = getPreferences();
  const [discordInstalled, discordRunning, accessibility] = await Promise.all([
    isDiscordInstalled(),
    isDiscordRunning(),
    checkAccessibility(),
  ]);

  return evaluateStatus({
    discordInstalled,
    discordRunning,
    accessibility,
    muteShortcut: prefs.muteShortcut,
    deafenShortcut: prefs.deafenShortcut,
  });
}
