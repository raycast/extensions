import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import type { VoiceControlResult } from "../../domain/types";

/**
 * Opt-in, local-only structured diagnostics (Phase 7). Writes one JSON line per event to a file in
 * the Raycast extension *support* path — never a remote service, never the user's content.
 *
 * Logged fields are restricted to: timestamp, requested action, selected mechanism, outcome status,
 * reason code, and a short sanitized detail. We deliberately exclude message content, server names,
 * channel names, account tokens, and system snapshots (per phase-07 acceptance criteria).
 */

const LOG_FILENAME = "diagnostics.log";

export interface DiagnosticEvent {
  readonly timestamp: string;
  readonly action: VoiceControlResult["action"];
  readonly mechanism: VoiceControlResult["mechanism"];
  readonly outcome: VoiceControlResult["outcome"];
  readonly reasonCode: VoiceControlResult["reasonCode"];
  readonly detail?: string;
  readonly errorCategory?: string;
  readonly durationMs?: number;
}

/** Build the sanitized event from a result. Exported (and pure) so it can be unit tested. */
export function toDiagnosticEvent(result: VoiceControlResult, now: Date = new Date()): DiagnosticEvent {
  return {
    timestamp: now.toISOString(),
    action: result.action,
    mechanism: result.mechanism,
    outcome: result.outcome,
    reasonCode: result.reasonCode,
    detail: result.diagnostics?.detail,
    errorCategory: result.diagnostics?.errorCategory,
    durationMs: result.diagnostics?.durationMs,
  };
}

/**
 * Append a diagnostic event for a result when logging is enabled. Failures to write are swallowed
 * (diagnostics must never break a user action). No-op when `enabled` is false.
 */
export async function logResult(result: VoiceControlResult, enabled: boolean): Promise<void> {
  if (!enabled) {
    return;
  }
  try {
    const dir = environment.supportPath;
    await mkdir(dir, { recursive: true });
    const line = JSON.stringify(toDiagnosticEvent(result)) + "\n";
    await appendFile(join(dir, LOG_FILENAME), line, "utf8");
  } catch {
    // Diagnostics are best-effort and must not affect the user-facing outcome.
  }
}
