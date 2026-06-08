/**
 * Domain types for the Discord voice-control MVP.
 *
 * These types define the product's trust model and must stay stable: every command outcome maps
 * to one {@link OutcomeStatus} + one {@link ReasonCode} + one user-facing message. Enums are kept
 * as a deliberate superset (e.g. `uiAutomation`, `discordRpc`) so the model can grow, but the MVP
 * only ever produces `shortcut` as an active mechanism. See vibe/phases/phase-02-extension-foundation.md.
 */

/** The two voice actions the MVP supports. */
export type VoiceAction = "toggleMute" | "toggleDeafen";

/**
 * Control mechanism that produced (or would produce) a result.
 * MVP uses `shortcut` only; `uiAutomation` and `discordRpc` are reserved for documented upgrades.
 * `none` means no mechanism ran (e.g. a prerequisite failed before dispatch).
 */
export type ControlMechanism = "shortcut" | "uiAutomation" | "discordRpc" | "none";

/** Whether an action is attemptable, given capability/readiness checks. */
export type AvailabilityStatus = "available" | "unavailable" | "degraded" | "unknown";

/**
 * Outcome of a command invocation.
 * - `success`  — best-effort: dispatch completed without error (the toggle was *sent*).
 * - `unavailable` — a prerequisite was missing before the attempt (e.g. Discord not running).
 * - `failed`   — the attempt ran and errored (e.g. permission missing, osascript/timeout).
 * - `unknown`  — rare ambiguous dispatch: neither a clear success nor a clear error.
 */
export type OutcomeStatus = "success" | "unavailable" | "failed" | "unknown";

/**
 * Stable, machine-readable reason codes. Every expected outcome has exactly one. These are part of
 * the product contract (drive message selection + diagnostics) — do not rename without updating the
 * message catalog and its tests.
 */
export const REASON_CODES = [
  // success (best-effort)
  "shortcutDispatched",
  // unavailable (prerequisite missing, detected before dispatch)
  "discordNotRunning",
  "discordNotInstalled",
  "shortcutNotConfigured",
  // failed (attempt ran and errored)
  "accessibilityPermissionMissing",
  "dispatchTimedOut",
  "dispatchError",
  "unexpectedError",
  // unknown
  "dispatchAmbiguous",
  // status-only readiness codes
  "statusReady",
  "statusDiscordNotRunning",
  "statusDiscordNotInstalled",
  "statusAccessibilityMissing",
  "statusShortcutNotConfigured",
  "statusUnknown",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

/**
 * Stable error categories (per product-rules.md "Error Categories"). User-facing copy is written
 * from these categories, never from raw exception strings.
 */
export type ErrorCategory =
  | "discordNotRunning"
  | "discordUnavailable"
  | "missingPermission"
  | "shortcutNotEffective"
  | "stateUnconfirmed"
  | "internalError";

/** Sanitized diagnostic detail attached to a result. Never contains Discord content or secrets. */
export interface Diagnostics {
  /** Short, sanitized human-readable note for local logs only. */
  readonly detail?: string;
  /** Error category when the outcome is `failed`/`unavailable`. */
  readonly errorCategory?: ErrorCategory;
  /** Wall-clock duration of the attempt in milliseconds, when measured. */
  readonly durationMs?: number;
}

/**
 * The single discriminated result type for every action and status outcome.
 * Discriminated by {@link OutcomeStatus} via the `outcome` field.
 */
export interface VoiceControlResult {
  /** The action that was requested (status results use `toggleMute` as a neutral placeholder). */
  readonly action: VoiceAction;
  /** The mechanism that ran (`none` if no mechanism executed). */
  readonly mechanism: ControlMechanism;
  /** Whether the action was attemptable. */
  readonly availability: AvailabilityStatus;
  /** The final outcome. */
  readonly outcome: OutcomeStatus;
  /** Stable machine-readable reason code. */
  readonly reasonCode: ReasonCode;
  /** Single user-facing message (best-effort wording; never asserts a voice state). */
  readonly message: string;
  /** Optional sanitized diagnostics for local logs only. */
  readonly diagnostics?: Diagnostics;
}
