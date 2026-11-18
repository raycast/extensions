// =============================================================================
// REACHABILITY PROBE
// Asks SidecarCore whether the iPad is there, without attempting to connect.
// -----------------------------------------------------------------------------
// Context: Raycast cannot keep a process resident, so "notice the moment the iPad
//   is back" has to be polling. Polling with a CONNECT is what made macOS post an
//   error banner per tick; this is a pure read of SidecarCore's device record, so
//   it is free to call as often as the background interval allows.
// NOTE: Goes through the Swift helper, which is also the only thing that drives
//   Sidecar. `betterdisplaycli` never exposed a liveness signal at all.
// NOTE: The underlying bit is undocumented and can flicker; the debounce and the
//   periodic sanity attempt that make it safe live in keepalive.ts, not here.
// =============================================================================

import { presence } from "swift:../../swift";

import type { Presence } from "./transport";

/**
 * Reads how the iPad can currently be reached.
 *
 * @param ipadName - The Sidecar device to probe.
 * @returns Per-transport presence, or null when the probe could not answer —
 *   never throws, because a tick must still be able to decide.
 *
 * NOTE: A probe failure degrades to null, which becomes "unknown" and behaves
 *   exactly as the extension did before the probe existed. Swallowing it here is
 *   the whole point: an unavailable probe must not break auto-reconnect.
 */
export async function probePresence(ipadName: string): Promise<Presence | null> {
  try {
    const found = await presence(ipadName);
    return { wireless: found.wireless === true, wired: found.wired === true };
  } catch {
    return null;
  }
}
