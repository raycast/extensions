import type { DiscordController } from "../domain/control";
import { buildResult } from "../domain/result";
import type { VoiceAction, VoiceControlResult } from "../domain/types";
import { logResult } from "../infrastructure/system/diagnostics";

/**
 * Toggle use case (Phase 4 orchestration). Command handlers call this, never the controller or
 * shortcut utilities directly. Responsibilities:
 *  - run the action through the injected {@link DiscordController},
 *  - normalize any *unexpected* thrown error into a typed `unexpectedError` result (expected
 *    operational outcomes are already typed by the controller),
 *  - emit one opt-in diagnostic record.
 *
 * Dependencies are injected so this is testable with a mock controller and a spy logger.
 */
export interface ToggleVoiceDeps {
  readonly controller: DiscordController;
  readonly diagnosticLogging: boolean;
  /** Injected for tests; defaults to the real diagnostics logger. */
  readonly log?: (result: VoiceControlResult, enabled: boolean) => Promise<void>;
}

export async function toggleVoice(
  action: VoiceAction,
  deps: ToggleVoiceDeps,
): Promise<VoiceControlResult> {
  let result: VoiceControlResult;
  try {
    result = await deps.controller.perform(action);
  } catch (error) {
    result = buildResult({
      action,
      mechanism: "none",
      outcome: "failed",
      reasonCode: "unexpectedError",
      diagnostics: {
        detail: error instanceof Error ? error.message.slice(0, 200) : "non-error throw",
        errorCategory: "internalError",
      },
    });
  }

  const log = deps.log ?? logResult;
  await log(result, deps.diagnosticLogging);
  return result;
}
