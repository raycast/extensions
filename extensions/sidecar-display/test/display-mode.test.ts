// =============================================================================
// HARDWARE TEST - DISPLAY MODE (native engine)
// Reproduces the mirroring case and asserts the extension heals it.
// -----------------------------------------------------------------------------
// Context: Requires `swift build` in swift/ and an iPad connected over Sidecar.
//   Uses a CoreGraphics export as an independent oracle for the main-display
//   check, so a regression cannot hide behind the code path under test.
// WARN: Briefly mirrors the iPad. Asserts the main display never moves.
// =============================================================================

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

import { ensureDisplayMode, isConnected, resolveIpadName } from "../src/lib/sidecar";
import { createHelperBackend, mainDisplayId } from "./support/nativeBackend";

import type { SidecarBackend } from "../src/lib/backend";
import type { SidecarConfig } from "../src/lib/sidecar";

/**
 * The main display's CoreGraphics ID, as an oracle.
 *
 * NOTE: Read through the Swift helper's public-CoreGraphics export rather than
 *   through the orchestration under test, so a regression cannot hide behind the
 *   same code path it is meant to catch.
 */
function mainDisplay(): number {
  return mainDisplayId();
}

describe("display mode on real hardware", () => {
  let backend: SidecarBackend;
  let config: SidecarConfig;
  let ipad: string;
  let mainBefore: number;

  before(async () => {
    backend = createHelperBackend();
    ipad = await resolveIpadName(backend, "");
    config = { ipadName: ipad, mode: "extend", settleTimeoutMs: 8_000 };
    mainBefore = mainDisplay();
  });

  it("finds a Sidecar device", async () => {
    const devices = await backend.listDevices();
    assert.ok(devices.length >= 1, JSON.stringify(devices));
  });

  it("starts with the iPad attached and not main", async () => {
    assert.equal(await backend.isIpadMain(ipad), false);
    assert.equal(await isConnected(backend, config), true);
  });

  it("writes nothing when the iPad already extends", async () => {
    const out = await ensureDisplayMode(backend, config);
    assert.equal(out.changed, false, JSON.stringify(out));
    assert.equal(out.settled, true, JSON.stringify(out));
  });

  it("heals a mirroring iPad back to extend", async () => {
    await backend.mirrorToMain(ipad);
    // macOS spends ~1s rearranging; read only once the topology has settled.
    await sleep(2_500);
    assert.equal(await backend.readMirror(ipad), true, "the case must reproduce first");

    const healed = await ensureDisplayMode(backend, config);
    assert.equal(healed.changed, true, JSON.stringify(healed));
    assert.equal(healed.settled, true, JSON.stringify(healed));
    assert.equal(await backend.readMirror(ipad), false);
  });

  it("leaves the main display exactly where it was", () => {
    assert.equal(mainDisplay(), mainBefore);
  });
});
