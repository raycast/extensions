// =============================================================================
// UNIT TEST - VIRTUAL SCREENS (stub CLI, no hardware)
// Proves the mirror fix never leaves a virtual screen disconnected.
// -----------------------------------------------------------------------------
// Context: Drives reconnectVirtualScreens against a stub betterdisplaycli script
//   so the real execFile path, argument construction, and error handling run
//   with zero hardware and no BetterDisplay installed.
// WARN: The load-bearing case is "the disconnect is rejected" — the reconnect
//   must still run, or the user's main display stays dark. That is the one this
//   file exists for.
// =============================================================================

import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { reconnectVirtualScreens } from "../src/lib/virtualscreens";

const dir = mkdtempSync(join(tmpdir(), "vs-test-"));
const cliPath = join(dir, "fake-betterdisplaycli");
const logPath = join(dir, "calls.log");

// A stub betterdisplaycli: logs every invocation's args, and takes its exit
// codes and get-output from environment variables set per case.
const script = `#!/bin/bash
echo "$@" >> "${logPath}"
case "$*" in
  *"--displayWithMainStatus"*) printf '%s' "$FAKE_GET_OUTPUT"; exit "\${FAKE_GET_EXIT:-0}" ;;
  *"--connected=off"*) exit "\${FAKE_OFF_EXIT:-0}" ;;
  *"--connected=on"*) exit "\${FAKE_ON_EXIT:-0}" ;;
  *) exit 0 ;;
esac
`;
writeFileSync(cliPath, script);
chmodSync(cliPath, 0o755);

interface CaseOptions {
  getOutput?: string;
  getExit?: string;
  offExit?: string;
  onExit?: string;
}

interface CaseResult {
  log: string;
  threw: boolean;
}

async function runCase({
  getOutput = "",
  getExit = "0",
  offExit = "0",
  onExit = "0",
}: CaseOptions = {}): Promise<CaseResult> {
  writeFileSync(logPath, "");
  process.env.FAKE_GET_OUTPUT = getOutput;
  process.env.FAKE_GET_EXIT = getExit;
  process.env.FAKE_OFF_EXIT = offExit;
  process.env.FAKE_ON_EXIT = onExit;

  let threw = false;
  try {
    // A 5ms pause keeps the test fast; production waits 1.5s.
    await reconnectVirtualScreens(cliPath, 5);
  } catch {
    threw = true;
  }
  return { log: existsSync(logPath) ? readFileSync(logPath, "utf8") : "", threw };
}

const VIRTUAL_MAIN = '{"UUID":"ABC-123","name":"Main Virtual Screen","deviceType":"VirtualScreen"}';
const PHYSICAL_MAIN = '{"UUID":"XYZ","name":"Built-in Display","deviceType":"Display"}';

after(() => {
  delete process.env.FAKE_GET_OUTPUT;
  delete process.env.FAKE_GET_EXIT;
  delete process.env.FAKE_OFF_EXIT;
  delete process.env.FAKE_ON_EXIT;
});

describe("reconnectVirtualScreens", () => {
  it("targets the main virtual screen by UUID", async () => {
    const { log } = await runCase({ getOutput: VIRTUAL_MAIN });
    assert.ok(log.includes("--UUID=ABC-123 --connected=off"), log);
    assert.ok(log.includes("--UUID=ABC-123 --connected=on"), log);
  });

  it("still reconnects when the disconnect is rejected", async () => {
    const { log, threw } = await runCase({ getOutput: VIRTUAL_MAIN, offExit: "1" });
    assert.equal(threw, false, "a rejected disconnect must not surface as an error");
    assert.ok(
      log.includes("--UUID=ABC-123 --connected=on"),
      "the screen must never be left disconnected",
    );
  });

  it("falls back to all virtual screens when main is not one", async () => {
    const { log, threw } = await runCase({ getOutput: PHYSICAL_MAIN });
    assert.equal(threw, false);
    assert.ok(log.includes("--type=VirtualScreen --connected=on"), log);
  });

  it("falls back to all virtual screens when the main-status read fails", async () => {
    const { log, threw } = await runCase({ getExit: "1" });
    assert.equal(threw, false);
    assert.ok(log.includes("--type=VirtualScreen --connected=on"), log);
  });

  it("surfaces a failed reconnect as an error", async () => {
    const { threw } = await runCase({ getOutput: VIRTUAL_MAIN, onExit: "1" });
    assert.equal(threw, true, "a failed reconnect is the one thing that must not be swallowed");
  });
});
