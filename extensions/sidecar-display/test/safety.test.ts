// =============================================================================
// HARDWARE TEST - SAFETY (native engine)
// Proves the extension makes no display changes when no Sidecar display exists.
// -----------------------------------------------------------------------------
// Context: Requires the Swift helper built (`swift build` in swift/) and NO
//   Sidecar display connected — the iPad may be paired, cabled or nearby, but it
//   must not be attached. That precondition IS the test: "absent" under the
//   native engine means "no Sidecar display present", not "unknown name". macOS
//   runs one Sidecar session, so the engine keys off the display rather than a
//   device name, and passing a bogus name proves nothing.
// NOTE: Makes no topology writes. The main-display oracle reads public
//   CoreGraphics through the helper, outside the orchestration under test, so a
//   regression cannot hide behind the same code path it is meant to catch.
// WARN: This is the regression guard for the incident where connecting an
//   unreachable iPad cycled the main display and scrambled every window.
// =============================================================================

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ensureDisplayMode, resolveIpadName } from "../src/lib/sidecar";
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

describe("absent-device safety", () => {
  let backend: SidecarBackend;
  let mainBefore: number;

  before(async () => {
    backend = createHelperBackend();
    mainBefore = mainDisplay();
    assert.notEqual(mainBefore, 0, "CoreGraphics must report a main display");
    // Fail loudly on the wrong precondition rather than mysteriously below.
    assert.equal(
      await backend.readMirror("any"),
      null,
      "disconnect the iPad before running: this suite tests the no-display case",
    );
  });

  it("honours and trims an explicit device override", async () => {
    assert.equal(await resolveIpadName(backend, "  X  "), "X");
  });

  it("reports no mirror state at all when no Sidecar display exists", async () => {
    // null means "nothing to read", which is what gates every mode write. Any
    // boolean here would be a guess, and a guess is what authorises a write.
    assert.equal(await backend.readMirror("No Such Display"), null);
    assert.equal(await backend.isIpadMain("No Such Display"), false);
  });

  it("refuses to settle when no display appears, leaving main untouched", async () => {
    const absent: SidecarConfig = {
      ipadName: "No Such Display",
      mode: "extend",
      settleTimeoutMs: 2_000,
    };

    await assert.rejects(
      () => ensureDisplayMode(backend, absent),
      "an absent display must be refused before any write",
    );
    assert.equal(mainDisplay(), mainBefore, "the main display must not have moved");
  });
});
