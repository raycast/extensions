// Unit tests for the CLI bridge. Each scenario points discovery at a fake
// `yerd` shell script in a temp dir (via PATH + overridden HOME) — the real
// daemon is never touched.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { _resetCache } from "../paths";
import { runYerd, runYerdDoctor, TIMEOUTS } from "../cli";
import {
  DaemonUnreachableError,
  YerdDaemonError,
  YerdParseError,
  YerdTimeoutError,
  YerdUsageError,
} from "../errors";

const tmpDir = join(tmpdir(), `yerd-cli-test-${Date.now()}`);

/** Write the fake `yerd` binary the next runYerd call will discover. */
function fakeBin(script: string): void {
  const p = join(tmpDir, "yerd");
  writeFileSync(p, `#!/bin/sh\n${script}\n`);
  chmodSync(p, 0o755);
}

let origPath: string | undefined;
let origHome: string | undefined;

before(() => {
  mkdirSync(tmpDir, { recursive: true });
  origPath = process.env.PATH;
  origHome = process.env.HOME;
});

after(() => {
  process.env.PATH = origPath;
  process.env.HOME = origHome;
  rmSync(tmpDir, { recursive: true, force: true });
  _resetCache();
});

/** Reset discovery so the fake binary in tmpDir wins over the real install. */
function useFakeBin(): void {
  _resetCache();
  process.env.PATH = `${tmpDir}:${origPath}`;
  // Break the default app-support path so PATH discovery is used
  process.env.HOME = "/nonexistent-home-override";
}

describe("runYerd — happy path", () => {
  it("parses JSON response on exit 0", async () => {
    fakeBin(`echo '{"type":"pong"}'; exit 0`);
    useFakeBin();
    const result = await runYerd<{ type: string }>(["ping"]);
    assert.strictEqual(result.type, "pong");
  });
});

describe("runYerd — error mapping", () => {
  it("exit 69 → DaemonUnreachableError with 'daemon' in userMessage", async () => {
    fakeBin("exit 69");
    useFakeBin();
    await assert.rejects(
      () => runYerd(["ping"]),
      (err: unknown) => {
        assert.ok(err instanceof DaemonUnreachableError);
        assert.ok(err.userMessage.toLowerCase().includes("daemon"));
        // Must NOT contain a raw stack trace
        assert.ok(!err.userMessage.includes("Error:"));
        return true;
      },
    );
  });

  it("exit 2 → YerdUsageError", async () => {
    fakeBin("echo 'bad usage' >&2; exit 2");
    useFakeBin();
    await assert.rejects(() => runYerd(["bad-cmd"]), YerdUsageError);
  });

  it("exit 1 with JSON error body → YerdDaemonError with parsed message", async () => {
    fakeBin(`echo '{"error":"site not found"}'; exit 1`);
    useFakeBin();
    await assert.rejects(
      () => runYerd(["sites"]),
      (err: unknown) => {
        assert.ok(err instanceof YerdDaemonError);
        assert.ok(err.userMessage.includes("site not found"));
        return true;
      },
    );
  });

  it("timeout → YerdTimeoutError", async () => {
    fakeBin("sleep 10");
    useFakeBin();
    await assert.rejects(
      () => runYerd(["ping"], { timeoutMs: 100 }),
      YerdTimeoutError,
    );
  });

  it("bad JSON → YerdParseError", async () => {
    fakeBin("echo 'not-json'; exit 0");
    useFakeBin();
    await assert.rejects(() => runYerd(["ping"]), YerdParseError);
  });
});

describe("runYerdDoctor", () => {
  it("exit 1 with findings JSON → parsed as data (not error)", async () => {
    const findings = JSON.stringify({
      type: "diagnoses",
      items: [
        {
          code: "daemon_running",
          severity: "ok",
          title: "Daemon",
          detail: "ok",
          remedy: null,
        },
      ],
    });
    fakeBin(`echo '${findings}'; exit 1`);
    useFakeBin();
    const result = await runYerdDoctor();
    assert.strictEqual(result.type, "diagnoses");
    assert.ok(Array.isArray(result.items));
  });

  it("exit 1 with synthetic 'Daemon not running' Fail → parsed as data NOT DaemonUnreachableError", async () => {
    const failDoc = JSON.stringify({
      type: "diagnoses",
      items: [
        {
          code: "daemon_running",
          severity: "fail",
          title: "Daemon not running",
          detail: "start the app",
          remedy: null,
        },
      ],
    });
    fakeBin(`echo '${failDoc}'; exit 1`);
    useFakeBin();
    const result = await runYerdDoctor();
    assert.strictEqual(result.items[0].severity, "fail");
    // Reaching here proves no DaemonUnreachableError was thrown
  });

  it("exit 0 with all-ok findings → parsed as data", async () => {
    const ok = JSON.stringify({
      type: "diagnoses",
      items: [
        {
          code: "x",
          severity: "ok",
          title: "OK",
          detail: "fine",
          remedy: null,
        },
      ],
    });
    fakeBin(`echo '${ok}'; exit 0`);
    useFakeBin();
    const result = await runYerdDoctor();
    assert.strictEqual(result.type, "diagnoses");
  });
});

describe("TIMEOUTS table", () => {
  it("has all required keys", () => {
    const keys = [
      "read",
      "logs",
      "mutate",
      "secure",
      "doctor",
      "dbTransfer",
      "tunnelShare",
      "install",
    ];
    for (const k of keys) assert.ok(k in TIMEOUTS, `missing TIMEOUTS.${k}`);
  });
  it("install is at least 600_000ms", () => {
    assert.ok(TIMEOUTS.install >= 600_000);
  });
});
