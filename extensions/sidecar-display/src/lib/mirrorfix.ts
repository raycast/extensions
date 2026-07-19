// =============================================================================
// MIRROR FIX AFTER CONNECT
// The shared guard that clears Sidecar's mirror mode on a fresh connect.
// -----------------------------------------------------------------------------
// Context: Every path that brings the link up (the Connect command, the menu-bar
//   Connect action, and the background auto-reconnect) runs this so the behaviour
//   cannot drift between them. The mechanism lives in virtualscreens.ts; this is
//   only the "should it run this time" gate.
// =============================================================================

import { getBetterDisplayCliPath, shouldFixMirrorAfterConnect } from "./preferences";
import { reconnectVirtualScreens } from "./virtualscreens";

import type { ModeOutcome } from "./sidecar";

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
  if (shouldFixMirrorAfterConnect() && outcome.linkEstablished === true) {
    await reconnectVirtualScreens(getBetterDisplayCliPath());
  }
}
