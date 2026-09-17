// =============================================================================
// TRANSPORT POLICY
// Turns "how can the iPad be reached?" into "should we chase it?".
// -----------------------------------------------------------------------------
// Context: The probe reports the two transports independently — wireless (bit 9)
//   and cable (bits 2+24). Which of them the user is willing to auto-connect over
//   is policy, not fact, so it lives here rather than in the probe or the state
//   machine. Pure, so the whole policy is unit-tested.
// NOTE: Proximity is a poor proxy for intent — "in range" includes being three
//   rooms away. Plugging a cable in is a deliberate physical act, so "cable only"
//   reads intent far better than presence ever can.
// =============================================================================

import type { Reachability } from "./keepalive";

/** Which transports the user is willing to auto-reconnect over. */
export type TransportPolicy = "any" | "cable" | "wireless";

/** What the probe found, per transport. */
export interface Presence {
  readonly wireless: boolean;
  readonly wired: boolean;
}

/**
 * What the probe saw, independent of policy.
 *
 * @param presence - What the probe found, or null when it could not answer.
 * @returns Whether the iPad is there at all.
 *
 * WARN: Deliberately NOT policy-filtered. The state machine records this as the
 *   presence the menu bar reflects, and the icon shows presence on any transport,
 *   so filtering it here would desynchronise the refresh predicate from the icon.
 */
export function presenceToReachability(presence: Presence | null): Reachability {
  if (presence === null) {
    return "unknown";
  }
  return presence.wired || presence.wireless ? "reachable" : "absent";
}

/**
 * Whether the transport the iPad is on is one the user allows chasing over.
 *
 * @param presence - What the probe found, or null when it could not answer.
 * @param policy   - Which transports the user allows.
 * @returns False only when the iPad is present but ONLY on an excluded transport.
 *
 * WARN: This must stay separate from reachability. Reporting an excluded
 *   transport as "absent" looks right but is not: "absent" means the probe MIGHT
 *   be wrong, so the hourly sanity attempt fires anyway — and because the iPad is
 *   genuinely reachable, that attempt SUCCEEDS. Measured: 24 connects a day under
 *   "cable only" with a Wi-Fi-present iPad, precisely what the setting forbids.
 *   An excluded transport is a decision, not an uncertainty; nothing to re-check.
 * NOTE: An unanswerable probe allows chasing. Refusing on "unknown" would let a
 *   broken probe silently disable auto-reconnect, the failure guarded against
 *   throughout this design.
 */
export function isTransportAllowed(presence: Presence | null, policy: TransportPolicy): boolean {
  if (presence === null || policy === "any") {
    return true;
  }
  if (!presence.wired && !presence.wireless) {
    return true;
  }
  return policy === "cable" ? presence.wired : presence.wireless;
}
