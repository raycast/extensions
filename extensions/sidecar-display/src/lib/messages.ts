// =============================================================================
// MESSAGES
// Pure user-facing text (HUD lines) — no @raycast/api, so it is unit-tested.
// -----------------------------------------------------------------------------
// Context: The single home for HUD wording, so the scheme stays consistent and
//   is edited in one place. Format is "<subject> - <state>"; a leading emoji is
//   the only colour cue a HUD supports (its text cannot be styled). feedback.ts
//   and the command entry points do the actual showHUD/toast I/O.
// =============================================================================

import type { DisplayMode } from "./backend";
import type { ModeOutcome, SidecarConfig } from "./sidecar";

const GREEN = "🟢";
const NEUTRAL = "⚪";
const WARN = "⚠️";
const FIX = "🔧";

/** Title-case past participle, infinitive, and emoji for a mode. */
function modeWords(mode: DisplayMode): { done: string; verb: string; emoji: string } {
  return mode === "mirror"
    ? { done: "Mirrored", verb: "mirror", emoji: "🪞" }
    : { done: "Extended", verb: "extend", emoji: "🖥️" };
}

/** Upper-cases the first character, leaving the rest untouched. */
function capitalize(text: string): string {
  return text.replace(/^./, (first) => first.toUpperCase());
}

/**
 * Summarises what happened once the iPad reached (or missed) the target mode
 * during a connect.
 *
 * @param config  - Resolved configuration, for the device and requested mode.
 * @param outcome - Result of the display-mode step.
 * @returns A single line suitable for a HUD.
 */
export function describeOutcome(config: SidecarConfig, outcome: ModeOutcome): string {
  const { done, verb, emoji } = modeWords(config.mode);
  const name = config.ipadName;

  if (outcome.skippedReason !== undefined) {
    return `${WARN} ${name} - Connected (${outcome.skippedReason})`;
  }
  if (!outcome.settled) {
    return `${WARN} ${name} - Connected, but could not ${verb}`;
  }
  return `${emoji} ${name} - ${done}`;
}

/**
 * Summarises an already-connected iPad switching extend/mirror from the menu bar.
 *
 * @param config  - Resolved configuration, for the device and requested mode.
 * @param outcome - Result of the display-mode step.
 * @returns A single line suitable for a HUD.
 *
 * NOTE: Unlike describeOutcome, no connect happened here, so a safe skip or an
 *   unsettled attempt must not read as success.
 */
export function describeModeSwitch(config: SidecarConfig, outcome: ModeOutcome): string {
  const { done, verb, emoji } = modeWords(config.mode);
  const name = config.ipadName;

  if (outcome.skippedReason !== undefined) {
    return `${WARN} ${name} - ${capitalize(outcome.skippedReason)}`;
  }
  if (!outcome.settled) {
    return `${WARN} ${name} - Could not ${verb}`;
  }
  return `${emoji} ${name} - ${done}`;
}

// ------------------------------------------------------------
// LINK & TOGGLE MESSAGES
// ------------------------------------------------------------

/** HUD for a completed connect. */
export function connectedMessage(name: string): string {
  return `${GREEN} ${name} - Connected`;
}

/** HUD for a completed disconnect. */
export function disconnectedMessage(name: string): string {
  return `${NEUTRAL} ${name} - Disconnected`;
}

/** HUD for a background/manual reconnect that brought the link back up. */
export function reconnectedMessage(name: string): string {
  return `${GREEN} ${name} - Reconnected`;
}

/** HUD for a manual reconnect when the link was already up. */
export function alreadyConnectedMessage(name: string): string {
  return `${GREEN} ${name} - Already connected`;
}

/** HUD for a completed Fix Mirroring run. */
export function mirroringFixedMessage(): string {
  return `${FIX} Mirroring - Fixed`;
}

/** HUD for flipping the auto-reconnect switch. */
export function autoReconnectMessage(on: boolean): string {
  return on ? `${GREEN} Auto-Reconnect - ON` : `${NEUTRAL} Auto-Reconnect - OFF`;
}

/** Menu-bar item label for the auto-reconnect toggle (its dot carries the colour). */
export function autoReconnectLabel(on: boolean): string {
  return on ? "Auto-Reconnect - ON" : "Auto-Reconnect - OFF";
}
