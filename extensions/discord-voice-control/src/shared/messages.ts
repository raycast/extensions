import type { ReasonCode, VoiceAction } from "../domain/types";

/**
 * Message catalog — the entire trust mechanism of the best-effort MVP.
 *
 * Rules enforced here (see vibe/phases/phase-06-user-feedback-and-best-effort-messaging.md):
 *  - Success wording is **action-oriented and best-effort** ("Toggle mute sent"), and must NEVER
 *    assert a resulting voice state ("Muted", "You are now muted", "Deafened").
 *  - Failure/unavailable messages explain the cause in user terms and give a next step when possible.
 *  - No raw shell/AppleScript/OS error text reaches the user (that lives in diagnostics only).
 *
 * The forbidden-word safety test in messages.test.ts asserts no message in this catalog implies a
 * confirmed state. If you add a reason code, add its message here and keep the wording safe.
 */

/** Human-readable label for an action, used in action-specific messages. */
export const ACTION_LABEL: Record<VoiceAction, string> = {
  toggleMute: "mute",
  toggleDeafen: "deafen",
};

/**
 * A message template is either a fixed string or a function of the requested action (so we can say
 * "Toggle mute sent" vs "Toggle deafen sent" from a single reason code).
 */
type MessageTemplate = string | ((action: VoiceAction) => string);

const MESSAGES: Record<ReasonCode, MessageTemplate> = {
  // --- success (best-effort: describes the action SENT, never an asserted state) ---
  shortcutDispatched: (action) => `Toggle ${ACTION_LABEL[action]} sent to Discord.`,

  // --- unavailable (prerequisite missing, detected before dispatch) ---
  discordNotRunning: "Discord is not running. Open Discord and try again.",
  discordNotInstalled: "Discord does not appear to be installed. Install Discord and try again.",
  shortcutNotConfigured:
    "No valid shortcut is configured. Set the mute/deafen keybind in extension preferences to match your Discord keybind.",

  // --- failed (the attempt ran and errored) ---
  accessibilityPermissionMissing:
    "Accessibility permission is required. Grant it in System Settings → Privacy & Security → Accessibility, then try again.",
  dispatchTimedOut: "The action timed out before Discord responded. Please try again.",
  dispatchError: "The action could not be completed. Please try again.",
  unexpectedError: "Something went wrong. Please try again.",

  // --- unknown (rare ambiguous dispatch) ---
  dispatchAmbiguous: (action) =>
    `Toggle ${ACTION_LABEL[action]} was attempted, but the result is unclear. Check Discord to confirm the state.`,

  // --- status-only readiness codes ---
  statusReady:
    "Ready to send mute/deafen toggles. Note: outcomes are best-effort — the toggle is sent, but the actual Discord state cannot be confirmed.",
  statusDiscordNotRunning: "Discord is not running. Open Discord to use voice control.",
  statusDiscordNotInstalled: "Discord does not appear to be installed. Install Discord to use voice control.",
  statusAccessibilityMissing:
    "Accessibility permission is required. Grant Raycast access in System Settings → Privacy & Security → Accessibility.",
  statusShortcutNotConfigured:
    "Shortcut setup is incomplete. Set the mute/deafen keybind in preferences to match your Discord keybind.",
  statusUnknown: "Readiness could not be determined. Open the status command details for next steps.",
};

/** Resolve the single user-facing message for a reason code. */
export function resolveMessage(reasonCode: ReasonCode, action: VoiceAction): string {
  const template = MESSAGES[reasonCode];
  return typeof template === "function" ? template(action) : template;
}

/**
 * A short, consistent best-effort disclaimer. Surfaced by the status command and available to any
 * caller that wants to remind the user without nagging on every toggle.
 */
export const BEST_EFFORT_NOTE =
  "Best-effort: the toggle is sent to Discord, but the resulting voice state cannot be confirmed.";
