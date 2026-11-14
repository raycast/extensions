// =============================================================================
// MIRROR FIX AFTER CONNECT
// The shared guard that clears Sidecar's mirror mode on a fresh connect.
// -----------------------------------------------------------------------------
// Context: Every path that brings the link up (the Connect command, the menu-bar
//   Connect action, and the background auto-reconnect) runs this so the behaviour
//   cannot drift between them. The mechanism lives in virtualscreens.ts; this is
//   only the "should it run this time" gate.
// =============================================================================

import { getPreferenceValues } from "@raycast/api";

import { usablePath } from "./betterdisplayapp";
import { hasVirtualScreens, reconnectVirtualScreens } from "./virtualscreens";

import type { ModeOutcome } from "./sidecar";

/**
 * The path to use for a mirror fix right now, or "" when it must not run.
 *
 * @param requireOptIn - Whether the "fix on fresh connect" preference must be on
 *   (true for the automatic path; false for an explicit user action).
 * @returns BetterDisplay's executable path when the fix can and should run.
 *
 * NOTE: Returns the validated path rather than a boolean so callers do not look
 *   it up again — the automatic path used to resolve it twice, leaving a window
 *   in which BetterDisplay could quit between the check and the use and the fix
 *   would then exec "".
 * WARN: EVERY mirror-fix path goes through this, so the command, the menu action
 *   and the automatic opt-in cannot drift apart in what they require.
 */
export async function mirrorFixPath(requireOptIn: boolean): Promise<string> {
  if (requireOptIn && getPreferenceValues<Preferences>().fixMirrorAfterConnect !== true) {
    return "";
  }
  const cliPath = await usablePath();
  if (cliPath === "") {
    return "";
  }
  return (await hasVirtualScreens(cliPath)) ? cliPath : "";
}

/**
 * Clears Sidecar's mirror mode after a genuinely fresh connect.
 *
 * Runs the virtual-screen reconnect only when the link was just established and
 * both the opt-in and BetterDisplay are present, so it never reshuffles the
 * desktop on a re-run over an already-connected iPad.
 *
 * @param outcome - The result of connectSidecar; its linkEstablished flag gates
 *   the fix to fresh connects.
 *
 * NOTE: Throws only when the reconnect itself fails, so callers can report it
 *   separately from the connect that already succeeded.
 */
export async function fixMirrorAfterFreshConnect(outcome: ModeOutcome): Promise<void> {
  if (outcome.linkEstablished !== true) {
    return;
  }
  const cliPath = await mirrorFixPath(true);
  if (cliPath !== "") {
    await reconnectVirtualScreens(cliPath);
  }
}
