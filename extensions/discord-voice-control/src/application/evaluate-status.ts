import { buildResult } from "../domain/result";
import type { ReasonCode, VoiceControlResult } from "../domain/types";
import type { AccessibilityStatus } from "../infrastructure/system/permission-probe";
import { parseShortcut } from "../infrastructure/system/shortcut-parser";

/**
 * Pure readiness evaluation (Phase 3). Takes already-gathered capability facts and decides the
 * single status outcome + reason code. No I/O here so the capability-to-message mapping is fully
 * unit-testable. "Ready" means *able to dispatch the shortcut* — not able to confirm the result;
 * the MVP has no confirmation source.
 */

export interface CapabilitySnapshot {
  readonly discordInstalled: boolean;
  readonly discordRunning: boolean;
  readonly accessibility: AccessibilityStatus;
  /** The configured combo strings, so we can verify at least the active ones parse. */
  readonly muteShortcut: string;
  readonly deafenShortcut: string;
}

export interface StatusEvaluation {
  /** Domain result carrying the reason code + best-effort message for the headline status. */
  readonly result: VoiceControlResult;
  /** Convenience booleans for the status view to render a checklist. */
  readonly checks: {
    readonly discordInstalled: boolean;
    readonly discordRunning: boolean;
    readonly accessibilityGranted: boolean;
    readonly accessibilityUnknown: boolean;
    readonly shortcutsConfigured: boolean;
  };
}

function bothShortcutsParse(mute: string, deafen: string): boolean {
  return parseShortcut(mute).ok && parseShortcut(deafen).ok;
}

/**
 * Decide readiness. Order of precedence (most blocking first):
 *  1. Discord not installed  → cannot use the extension at all.
 *  2. Shortcut not configured → setup is incomplete (distinct from runtime unavailability).
 *  3. Accessibility missing   → permission blocked.
 *  4. Discord not running     → runtime-unavailable (transient).
 *  5. Accessibility unknown    → can't confirm readiness.
 *  6. Otherwise               → ready (best-effort).
 */
export function evaluateStatus(snapshot: CapabilitySnapshot): StatusEvaluation {
  const shortcutsConfigured = bothShortcutsParse(snapshot.muteShortcut, snapshot.deafenShortcut);
  const accessibilityGranted = snapshot.accessibility === "granted";
  const accessibilityUnknown = snapshot.accessibility === "unknown";

  const checks = {
    discordInstalled: snapshot.discordInstalled,
    discordRunning: snapshot.discordRunning,
    accessibilityGranted,
    accessibilityUnknown,
    shortcutsConfigured,
  };

  let reasonCode: ReasonCode;
  let outcome: VoiceControlResult["outcome"];

  if (!snapshot.discordInstalled && !snapshot.discordRunning) {
    // Only treat as "not installed" when it is also not running (running implies it exists).
    reasonCode = "statusDiscordNotInstalled";
    outcome = "unavailable";
  } else if (!shortcutsConfigured) {
    reasonCode = "statusShortcutNotConfigured";
    outcome = "unavailable";
  } else if (snapshot.accessibility === "missing") {
    reasonCode = "statusAccessibilityMissing";
    outcome = "failed";
  } else if (!snapshot.discordRunning) {
    reasonCode = "statusDiscordNotRunning";
    outcome = "unavailable";
  } else if (accessibilityUnknown) {
    reasonCode = "statusUnknown";
    outcome = "unknown";
  } else {
    reasonCode = "statusReady";
    outcome = "success";
  }

  return {
    result: buildResult({
      action: "toggleMute", // neutral placeholder; status is action-agnostic
      mechanism: "shortcut",
      outcome,
      reasonCode,
    }),
    checks,
  };
}
