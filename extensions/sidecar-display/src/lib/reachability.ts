// =============================================================================
// REACHABILITY PROBE
// Asks SidecarCore whether the iPad is there, without attempting to connect.
// -----------------------------------------------------------------------------
// Context: Raycast cannot keep a process resident, so "notice the moment the iPad
//   is back" has to be polling. Polling with a CONNECT is what made macOS post an
//   error banner per tick; this is a pure read of SidecarCore's device record, so
//   it is free to call as often as the background interval allows.
// WARN: Cross-engine on purpose. It always goes through the Swift helper, even
//   under the BetterDisplay engine, because `betterdisplaycli` exposes no
//   liveness signal — same pattern as virtualscreens.ts going the other way.
// NOTE: The underlying bit is undocumented and can flicker; the debounce and the
//   periodic sanity attempt that make it safe live in keepalive.ts, not here.
// =============================================================================

import { reachable } from "swift:../../swift";

import type { Reachability } from "./keepalive";

/**
 * Reads whether the iPad currently looks reachable.
 *
 * @param ipadName - The Sidecar device to probe.
 * @returns "reachable" or "absent" when the probe answers, "unknown" when it is
 *   unavailable — never throws, because a tick must still be able to decide.
 *
 * NOTE: A probe failure degrades to "unknown", which keepalive treats exactly as
 *   it behaved before the probe existed. Swallowing it here is the whole point:
 *   an unavailable probe must not break auto-reconnect.
 */
export async function probeReachability(ipadName: string): Promise<Reachability> {
  try {
    return (await reachable(ipadName)) ? "reachable" : "absent";
  } catch {
    return "unknown";
  }
}
