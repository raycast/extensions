// =============================================================================
// UNIT TEST - TRANSPORT POLICY
// Pure logic; no hardware, no Raycast. Runs anywhere.
// -----------------------------------------------------------------------------
// Context: Proves the full policy matrix, and above all that an EXCLUDED
//   transport is kept distinct from an ABSENT iPad. Collapsing the two made
//   "cable only" connect over Wi-Fi 24 times a day via the sanity attempt —
//   the exact thing the setting promises not to do.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isTransportAllowed, presenceToReachability } from "../src/lib/transport";

import type { Presence, TransportPolicy } from "../src/lib/transport";

const BOTH: Presence = { wireless: true, wired: true };
const WIFI: Presence = { wireless: true, wired: false };
const CABLE: Presence = { wireless: false, wired: true };
const GONE: Presence = { wireless: false, wired: false };

describe("presenceToReachability", () => {
  it("reports presence on any transport, ignoring policy entirely", () => {
    // The menu-bar icon answers "is my iPad here?", so this must not filter.
    assert.equal(presenceToReachability(BOTH), "reachable");
    assert.equal(presenceToReachability(WIFI), "reachable");
    assert.equal(presenceToReachability(CABLE), "reachable");
  });

  it("reports absent only when no transport has it", () => {
    assert.equal(presenceToReachability(GONE), "absent");
  });

  it("reports unknown when the probe could not answer", () => {
    assert.equal(presenceToReachability(null), "unknown");
  });
});

describe("isTransportAllowed", () => {
  const CASES: ReadonlyArray<{
    readonly policy: TransportPolicy;
    readonly presence: Presence | null;
    readonly allowed: boolean;
    readonly why: string;
  }> = [
    { policy: "any", presence: WIFI, allowed: true, why: "any accepts wireless" },
    { policy: "any", presence: CABLE, allowed: true, why: "any accepts cable" },
    { policy: "any", presence: BOTH, allowed: true, why: "any accepts both" },
    { policy: "any", presence: GONE, allowed: true, why: "nothing to exclude" },
    { policy: "cable", presence: CABLE, allowed: true, why: "cable present" },
    { policy: "cable", presence: BOTH, allowed: true, why: "cable present alongside wifi" },
    { policy: "cable", presence: WIFI, allowed: false, why: "THE case: nearby but not plugged in" },
    { policy: "cable", presence: GONE, allowed: true, why: "absent is not an exclusion" },
    { policy: "wireless", presence: WIFI, allowed: true, why: "wireless present" },
    { policy: "wireless", presence: BOTH, allowed: true, why: "wireless present alongside cable" },
    { policy: "wireless", presence: CABLE, allowed: false, why: "cabled only, wireless excluded" },
    { policy: "wireless", presence: GONE, allowed: true, why: "absent is not an exclusion" },
    { policy: "cable", presence: null, allowed: true, why: "an unanswerable probe must not disable reconnect" },
    { policy: "wireless", presence: null, allowed: true, why: "an unanswerable probe must not disable reconnect" },
  ];

  for (const c of CASES) {
    it(`${c.allowed ? "allows" : "blocks"} policy=${c.policy} presence=${JSON.stringify(c.presence)} — ${c.why}`, () => {
      assert.equal(isTransportAllowed(c.presence, c.policy), c.allowed);
    });
  }

  it("keeps exclusion distinct from absence, so the sanity attempt cannot fire", () => {
    // Both report "reachable" — only the allow flag differs. That separation is
    // what stops the hourly re-check connecting an iPad the user excluded.
    assert.equal(presenceToReachability(WIFI), "reachable");
    assert.equal(isTransportAllowed(WIFI, "cable"), false);
  });
});
