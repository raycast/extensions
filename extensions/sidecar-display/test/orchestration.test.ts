// =============================================================================
// UNIT TEST - ORCHESTRATION (mock backend, no hardware)
// Proves the safety invariants of connect and ensureDisplayMode.
// -----------------------------------------------------------------------------
// Context: Drives the engine-agnostic orchestration against a scripted mock
//   backend, proving the safety invariants with zero hardware: it never writes
//   the main display, never cycles a display, never writes for an absent one,
//   declines when the iPad is main, and only changes a mode that differs.
// NOTE: The mock implements SidecarBackend, so it cannot drift from the real
//   interface without failing to compile — that is the point of typing it.
//   The interface exposes no way to write main or cycle a display, so "never
//   touches main" is structural, not merely untested.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { connectSidecar, ensureDisplayMode } from "../src/lib/sidecar";

import type { SidecarBackend } from "../src/lib/backend";
import type { SidecarConfig } from "../src/lib/sidecar";

/** A mock engine that records every mutation it is asked to make. */
interface MockBackend extends SidecarBackend {
  readonly calls: string[];
}

interface MockState {
  devices: { name: string; uuid: string }[];
  connected: boolean;
  /** null models "the display is not present". */
  mirror: boolean | null;
  ipadMain: boolean;
  /**
   * When set, readMirror yields these in order (then falls back to `mirror`).
   * Models macOS reporting a transient mid-stream state before settling — the
   * reason ensureDisplayMode holds across REQUIRED_STABLE_READS rather than
   * trusting one confirming read.
   */
  mirrorReads: (boolean | null)[] | null;
}

function makeBackend(overrides: Partial<MockState> = {}): MockBackend {
  const calls: string[] = [];
  const s: MockState = {
    devices: [{ name: "iPad", uuid: "U1" }],
    connected: true,
    mirror: false,
    ipadMain: false,
    mirrorReads: null,
    ...overrides,
  };

  return {
    calls,
    listDevices: async () => s.devices,
    isConnected: async () => s.connected,
    setConnected: async (_name: string, connected: boolean) => {
      calls.push(`setConnected:${connected}`);
      s.connected = connected;
    },
    readMirror: async () => {
      if (s.mirrorReads !== null && s.mirrorReads.length > 0) {
        return s.mirrorReads.shift() ?? null;
      }
      return s.mirror;
    },
    isIpadMain: async () => s.ipadMain,
    extend: async () => {
      calls.push("extend");
      s.mirror = false;
    },
    mirrorToMain: async () => {
      calls.push("mirrorToMain");
      s.mirror = true;
    },
  };
}

const cfg = (mode: "extend" | "mirror" = "extend"): SidecarConfig => ({
  ipadName: "iPad",
  mode,
  settleTimeoutMs: 3_000,
});

describe("ensureDisplayMode", () => {
  it("writes nothing when the iPad already matches the target mode", async () => {
    const b = makeBackend({ mirror: false });
    const out = await ensureDisplayMode(b, cfg("extend"));
    assert.equal(out.changed, false);
    assert.equal(out.settled, true);
    assert.deepEqual(b.calls, []);
  });

  it("extends a mirrored iPad with exactly one write", async () => {
    const b = makeBackend({ mirror: true });
    const out = await ensureDisplayMode(b, cfg("extend"));
    assert.equal(out.changed, true);
    assert.equal(out.settled, true);
    assert.deepEqual(b.calls, ["extend"]);
  });

  it("folds the iPad into the main mirror set for mirror mode", async () => {
    const b = makeBackend({ mirror: false });
    const out = await ensureDisplayMode(b, cfg("mirror"));
    assert.equal(out.changed, true);
    assert.equal(out.settled, true);
    assert.deepEqual(b.calls, ["mirrorToMain"]);
  });

  it("declines and writes nothing when the iPad IS the main display", async () => {
    const b = makeBackend({ mirror: true, ipadMain: true });
    const out = await ensureDisplayMode(b, cfg("extend"));
    assert.notEqual(out.skippedReason, undefined);
    assert.deepEqual(b.calls, [], "must not touch the main display");
  });

  it("refuses an absent display and writes nothing", async () => {
    const b = makeBackend({ mirror: null });
    await assert.rejects(() => ensureDisplayMode(b, cfg("extend")));
    assert.deepEqual(b.calls, [], "an unreachable iPad must never reach a write");
  });

  it("re-extends after a mid-stream flip and only settles once it holds", async () => {
    // Two correct reads, then macOS flips it back to mirrored, then it holds.
    // A single confirming read must NOT be trusted as settled (would report
    // settled at read 1 and never issue the corrective write).
    const b = makeBackend({ mirrorReads: [false, false, true, false, false, false] });
    const out = await ensureDisplayMode(b, cfg("extend"));
    assert.equal(out.settled, true);
    assert.deepEqual(b.calls, ["extend"], "must re-assert extend on the mid-stream disagreement");
  });

  it("re-mirrors after a mid-stream flip and only settles once it holds", async () => {
    const b = makeBackend({ mirrorReads: [true, true, false, true, true, true] });
    const out = await ensureDisplayMode(b, cfg("mirror"));
    assert.equal(out.settled, true);
    assert.deepEqual(b.calls, ["mirrorToMain"], "must re-assert mirror on the mid-stream disagreement");
  });
});

describe("connectSidecar", () => {
  it("writes nothing when already connected and correct, and is not a fresh connect", async () => {
    const b = makeBackend({ connected: true, mirror: false });
    const out = await connectSidecar(b, cfg("extend"));
    assert.equal(out.changed, false);
    assert.deepEqual(b.calls, []);
    // linkEstablished gates the mirror fix; a re-run must not re-trigger it.
    assert.notEqual(out.linkEstablished, true);
  });

  it("brings the link up and flags a fresh connect", async () => {
    const b = makeBackend({ connected: false, mirror: false });
    const out = await connectSidecar(b, cfg("extend"));
    assert.ok(b.calls.includes("setConnected:true"));
    assert.equal(out.linkEstablished, true);
  });
});
