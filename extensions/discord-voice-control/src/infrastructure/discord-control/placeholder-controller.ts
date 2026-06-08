import type { DiscordController } from "../../domain/control";
import { buildResult } from "../../domain/result";
import type { VoiceAction, VoiceControlResult } from "../../domain/types";

/**
 * Phase 2 placeholder adapter. Implements the control interface but performs no automation; it
 * returns a deterministic, non-misleading `unavailable` result. Retained so the command surface and
 * application layer can be exercised independently of real automation (and as a safe default if a
 * real adapter is ever unavailable). Never reports success.
 */
export class PlaceholderController implements DiscordController {
  readonly name = "placeholder";

  async perform(action: VoiceAction): Promise<VoiceControlResult> {
    return buildResult({
      action,
      mechanism: "none",
      outcome: "unavailable",
      reasonCode: "shortcutNotConfigured",
      diagnostics: {
        detail: "placeholder controller: no automation wired",
        errorCategory: "shortcutNotEffective",
      },
    });
  }
}
