// =============================================================================
// HARDWARE TEST - SAFETY (BetterDisplay engine, no iPad required)
// Proves the extension makes no display changes when the iPad is absent.
// -----------------------------------------------------------------------------
// Context: Requires BetterDisplay running. Does NOT require an iPad and makes no
//   topology writes. Uses betterdisplaycli directly as an independent oracle for
//   the main-display check, so a regression cannot hide behind the same code
//   path it is meant to be testing.
// WARN: This is the regression guard for the incident where connecting an
//   unreachable iPad cycled the main display and scrambled every window.
// =============================================================================

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { before, describe, it } from "node:test";

import { createBetterDisplayBackend } from "../src/lib/betterdisplay";
import { ensureDisplayMode, resolveIpadName } from "../src/lib/sidecar";

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

describe("absent-device safety", () => {
  let backend: SidecarBackend;
  let mainBefore: string;

  before(() => {
    backend = createBetterDisplayBackend(CLI);
    mainBefore = mainUuid();
    assert.notEqual(mainBefore, "?", "BetterDisplay must report a main display");
  });

  it("honours and trims an explicit device override", async () => {
    assert.equal(await resolveIpadName(backend, "  X  "), "X");
  });

  it("reports an absent display as null rather than guessing", async () => {
    assert.equal(await backend.readMirror("No Such Display"), null);
  });

  it("refuses to settle an absent display, leaving main untouched", async () => {
    const absent: SidecarConfig = {
      ipadName: "No Such Display",
      mode: "extend",
      settleTimeoutMs: 2_000,
    };

    await assert.rejects(
      () => ensureDisplayMode(backend, absent),
      "an absent display must be refused before any write",
    );
    assert.equal(mainUuid(), mainBefore, "the main display must not have moved");
  });
});
