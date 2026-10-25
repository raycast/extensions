import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  compareVersions,
  hostUpdateNeeded,
  isValidPin,
  outdatedHostPids,
  restartOutdatedHosts,
  verifyPinnedFile,
} from "../src/lib/host-version.ts";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("native-host-pin.json", () => {
  test("is a valid pin for both release assets", () => {
    const pin = JSON.parse(readFileSync(new URL("../src/lib/native-host-pin.json", import.meta.url), "utf-8"));
    assert.ok(isValidPin(pin), "valid pin");
    assert.deepEqual(Object.keys(pin.sha256).sort(), ["host.bundle.js", "run.sh"]);
  });
});

describe("isValidPin", () => {
  const good = { version: "1.2.0", sha256: { "run.sh": "a".repeat(64) } };

  test("accepts a version with 64-character hex hashes", () => {
    assert.equal(isValidPin(good), true);
  });

  test("rejects a bad version, missing or malformed hashes", () => {
    assert.equal(isValidPin({ ...good, version: "latest" }), false);
    assert.equal(isValidPin({ ...good, sha256: {} }), false);
    assert.equal(isValidPin({ ...good, sha256: { "run.sh": "abc" } }), false);
    assert.equal(isValidPin({ ...good, sha256: { "run.sh": "A".repeat(64) } }), false);
    assert.equal(isValidPin(null), false);
  });
});

describe("compareVersions", () => {
  test("compares each part numerically", () => {
    assert.ok(compareVersions("1.1.1", "1.2.0") < 0);
    assert.ok(compareVersions("1.10.0", "1.9.9") > 0);
    assert.ok(compareVersions("2.0.0", "1.99.99") > 0);
    assert.equal(compareVersions("1.2.0", " 1.2.0\n"), 0);
  });

  test("throws on something that isn't a version", () => {
    assert.throws(() => compareVersions("1.2", "1.2.0"));
    assert.throws(() => compareVersions("1.2.0-beta.1", "1.2.0"));
  });
});

describe("hostUpdateNeeded", () => {
  test("only when the installed host is older than the pin", () => {
    assert.equal(hostUpdateNeeded("1.1.1", "1.2.0"), true);
    assert.equal(hostUpdateNeeded("1.2.0", "1.2.0"), false);
    assert.equal(hostUpdateNeeded("1.3.0", "1.2.0"), false, "never downgrades");
  });

  test("not when nothing is installed or the version is unreadable", () => {
    assert.equal(hostUpdateNeeded(null, "1.2.0"), false);
    assert.equal(hostUpdateNeeded("garbage", "1.2.0"), false);
  });
});

describe("verifyPinnedFile", () => {
  const pin = { version: "1.2.0", sha256: { "host.bundle.js": sha256("bundle") } };

  test("accepts a file matching its pinned hash", () => {
    assert.doesNotThrow(() => verifyPinnedFile(Buffer.from("bundle"), "host.bundle.js", pin));
  });

  test("rejects a file that differs from the pinned release", () => {
    assert.throws(() => verifyPinnedFile(Buffer.from("tampered"), "host.bundle.js", pin), /Checksum mismatch/);
  });

  test("rejects a file with no pinned hash", () => {
    assert.throws(() => verifyPinnedFile(Buffer.from("x"), "run.sh", pin), /No pinned checksum/);
  });
});

describe("outdatedHostPids", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "raycast-firefox-outdated-"));
    mkdirSync(join(dir, "hosts"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const record = (name: string, value: object | string) =>
    writeFileSync(join(dir, "hosts", name), typeof value === "string" ? value : JSON.stringify(value));

  test("lists hosts older than the pin or without a version, and the legacy host", () => {
    record("1.json", { pid: 11, version: "1.1.1" });
    record("2.json", { pid: 12, version: "1.2.0" });
    record("3.json", { pid: 13 });
    record("4.json", { pid: 14, version: "1.3.0" });
    writeFileSync(join(dir, "host.pid"), "15\n");

    assert.deepEqual(outdatedHostPids(dir, "1.2.0").sort(), [11, 13, 15]);
  });

  test("skips unreadable records and records without a PID", () => {
    record("1.json", "{not json");
    record("2.json", { version: "1.1.1" });
    record("3.json.tmp.99", { pid: 99, version: "1.0.0" });
    assert.deepEqual(outdatedHostPids(dir, "1.2.0"), []);
  });

  test("returns nothing when no host has run", () => {
    rmSync(join(dir, "hosts"), { recursive: true });
    assert.deepEqual(outdatedHostPids(dir, "1.2.0"), []);
  });
});

describe("restartOutdatedHosts", () => {
  test("stops only processes that are running the installed host bundle", () => {
    const signalled: Array<[number, string]> = [];
    const stopped = restartOutdatedHosts("/unused", "1.2.0", {
      pids: [11, 12, 13],
      isHost: (pid) => pid !== 12,
      kill: ((pid: number, signal: string) => {
        signalled.push([pid, signal]);
        return true;
      }) as typeof process.kill,
    });
    assert.equal(stopped, 2);
    assert.deepEqual(signalled, [
      [11, "SIGTERM"],
      [13, "SIGTERM"],
    ]);
  });

  test("doesn't count a host that has already exited", () => {
    const stopped = restartOutdatedHosts("/unused", "1.2.0", {
      pids: [11],
      isHost: () => true,
      kill: (() => {
        throw Object.assign(new Error("ESRCH"), { code: "ESRCH" });
      }) as typeof process.kill,
    });
    assert.equal(stopped, 0);
  });
});
