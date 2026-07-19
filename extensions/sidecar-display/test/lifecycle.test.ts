// =============================================================================
// HARDWARE TEST - CONNECT LIFECYCLE (BetterDisplay engine)
// Exercises connect, disconnect, and idempotence on real hardware.
// -----------------------------------------------------------------------------
// Context: Requires BetterDisplay running and an iPad paired for Sidecar.
// WARN: Disconnects and reconnects the iPad. Leaves it connected and extending.
//   The cases share the link's state and run in file order — they are one
//   sequence, not independent tests.
// =============================================================================

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, describe, it } from "node:test";

import { createBetterDisplayBackend } from "../src/lib/betterdisplay";
import { connectSidecar, disconnectSidecar, isConnected, resolveIpadName } from "../src/lib/sidecar";

import type { SidecarBackend } from "../src/lib/backend";
import type { SidecarConfig } from "../src/lib/sidecar";

const CLI = process.env.BD_CLI ?? "/opt/homebrew/bin/betterdisplaycli";

/** The main display's UUID, read straight from the CLI as an oracle. */
function mainUuid(): string {
  const raw = execFileSync(CLI, ["get", "--displayWithMainStatus", "--identifiers"], {
    encoding: "utf8",
  });
  return raw.match(/"UUID"\s*:\s*"([^"]+)"/)?.[1] ?? "?";
}

describe("connect lifecycle on real hardware", () => {
  let backend: SidecarBackend;
  let config: SidecarConfig;
  let ipad: string;
  let mainBefore: string;

  before(async () => {
    backend = createBetterDisplayBackend(CLI);
    ipad = await resolveIpadName(backend, "");
    config = { ipadName: ipad, mode: "extend", settleTimeoutMs: 15_000 };
    mainBefore = mainUuid();
  });

  it("takes the link down and the display with it", async () => {
    await disconnectSidecar(backend, config);
    assert.equal(await isConnected(backend, config), false);
    assert.equal(await backend.readMirror(ipad), null);
  });

  it("tolerates a redundant disconnect", async () => {
    // `set --sidecarConnected` is not idempotent; the read-before-write must absorb this.
    await disconnectSidecar(backend, config);
  });

  it("brings the link up and reaches a safe outcome", async () => {
    const out = await connectSidecar(backend, config);
    assert.equal(await isConnected(backend, config), true);
    // Declining because the iPad became main is a safe outcome, not a failure.
    const safe = out.settled === true || /main/.test(out.skippedReason ?? "");
    assert.ok(safe, JSON.stringify(out));
  });

  it("makes no change on a redundant connect", async () => {
    const again = await connectSidecar(backend, config);
    assert.equal(again.changed, false, JSON.stringify(again));
  });

  after(() => {
    // Not an assertion: macOS itself may move main across a reconnect. The
    // extension never writes main — that is proven by safety + orchestration.
    const mainAfter = mainUuid();
    console.warn(
      mainAfter === mainBefore
        ? "NOTE  main display unchanged across reconnect"
        : `NOTE  macOS moved main across reconnect (${mainBefore} -> ${mainAfter}); not written by the extension`,
    );
  });
});
