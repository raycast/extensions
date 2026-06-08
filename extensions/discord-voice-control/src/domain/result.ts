import { resolveMessage } from "../shared/messages";
import type {
  AvailabilityStatus,
  ControlMechanism,
  Diagnostics,
  OutcomeStatus,
  ReasonCode,
  VoiceAction,
  VoiceControlResult,
} from "./types";

/**
 * The canonical availability for each outcome status. Keeping this mapping in one place guarantees,
 * for example, that a `success` is always reported as `available` and a prerequisite `unavailable`
 * is never accidentally marked `available`.
 */
const AVAILABILITY_FOR_OUTCOME: Record<OutcomeStatus, AvailabilityStatus> = {
  success: "available",
  unavailable: "unavailable",
  failed: "degraded",
  unknown: "unknown",
};

export interface BuildResultInput {
  readonly action: VoiceAction;
  readonly mechanism: ControlMechanism;
  readonly outcome: OutcomeStatus;
  readonly reasonCode: ReasonCode;
  /** Override the default availability derived from the outcome (rarely needed). */
  readonly availability?: AvailabilityStatus;
  /** Override the catalog message (rarely needed; prefer the catalog so wording stays consistent). */
  readonly message?: string;
  readonly diagnostics?: Diagnostics;
}

/**
 * Build a {@link VoiceControlResult}. The user-facing message is resolved from the central catalog
 * keyed by reason code, so wording (and the best-effort "sent" discipline) is enforced in one place.
 */
export function buildResult(input: BuildResultInput): VoiceControlResult {
  return {
    action: input.action,
    mechanism: input.mechanism,
    availability: input.availability ?? AVAILABILITY_FOR_OUTCOME[input.outcome],
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    message: input.message ?? resolveMessage(input.reasonCode, input.action),
    diagnostics: input.diagnostics,
  };
}
