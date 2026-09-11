import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  acquireLock,
  FUTURE_SKEW_MS,
  heartbeatLock,
  inspectLock,
  registerWingetPid,
  releaseLock,
  STALE_MS,
  type LockEnvironment,
  type LockRecord,
} from "./lock";

let dir: string;
let lockPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "winget-lock-test-"));
  lockPath = join(dir, "op-lock.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeEnv(overrides: Partial<LockEnvironment> = {}): LockEnvironment & { advance: (ms: number) => void } {
  let nowMs = 1_000_000;
  return {
    now: () => nowMs,
    isWingetProcessAlive: () => false,
    advance: (ms: number) => {
      nowMs += ms;
    },
    ...overrides,
  };
}

function readLockRecord(): LockRecord {
  return JSON.parse(readFileSync(lockPath, "utf-8")) as LockRecord;
}

describe("acquire/release", () => {
  it("acquires a free lock and writes the full record", () => {
    const env = makeEnv();
    const result = acquireLock(lockPath, { opId: "a", kind: "install", title: "Installing jq" }, env);
    expect(result.status).toBe("acquired");
    const record = readLockRecord();
    expect(record.opId).toBe("a");
    expect(record.wingetPid).toBeNull();
  });

  it("reports busy with the holder while the lock is fresh", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "a", kind: "install", title: "Installing jq" }, env);
    const second = acquireLock(lockPath, { opId: "b", kind: "upgrade", title: "Upgrading jq" }, env);
    expect(second.status).toBe("busy");
    expect(second.status === "busy" && second.holder?.opId).toBe("a");
  });

  it("release verifies ownership before unlinking", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "a", kind: "install", title: "t" }, env);
    expect(releaseLock(lockPath, "not-mine")).toBe(false);
    expect(inspectLock(lockPath, env).state).toBe("held");
    expect(releaseLock(lockPath, "a")).toBe(true);
    expect(inspectLock(lockPath, env).state).toBe("free");
  });
});

describe("heartbeat and fencing", () => {
  it("refreshes the heartbeat for the owner", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "a", kind: "install", title: "t" }, env);
    env.advance(5_000);
    expect(heartbeatLock(lockPath, "a", env)).toBe("ok");
    expect(readLockRecord().heartbeatAt).toBe(env.now());
  });

  it("fences a foreign or missing lock", () => {
    const env = makeEnv();
    expect(heartbeatLock(lockPath, "a", env)).toBe("fenced");
    acquireLock(lockPath, { opId: "b", kind: "install", title: "t" }, env);
    expect(heartbeatLock(lockPath, "a", env)).toBe("fenced");
  });

  it("keeps the file parseable when the record shrinks (truncating rewrite)", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "a", kind: "install", title: "a-rather-long-title-here" }, env);
    expect(registerWingetPid(lockPath, "a", 123_456_789)).toBe("ok");
    expect(registerWingetPid(lockPath, "a", null)).toBe("ok");
    expect(readLockRecord().wingetPid).toBeNull();
  });
});

describe("staleness and reaping", () => {
  it("reaps a stale lock and returns the dead record", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "dead", kind: "install", title: "t" }, env);
    env.advance(STALE_MS + 1_000);
    const result = acquireLock(lockPath, { opId: "new", kind: "upgrade", title: "t2" }, env);
    expect(result.status).toBe("acquired");
    expect(result.status === "acquired" && result.reaped?.opId).toBe("dead");
    expect(readLockRecord().opId).toBe("new");
  });

  it("refuses to grant while the dead holder's winget is still alive", () => {
    const env = makeEnv({ isWingetProcessAlive: () => true });
    acquireLock(lockPath, { opId: "dead", kind: "install", title: "t" }, env);
    registerWingetPid(lockPath, "dead", 4242);
    env.advance(STALE_MS + 1_000);
    const result = acquireLock(lockPath, { opId: "new", kind: "upgrade", title: "t2" }, env);
    expect(result.status).toBe("orphan-winget-running");
    expect(readLockRecord().opId).toBe("dead");
  });

  it("treats a far-future heartbeat as stale (backward clock step with dead holder)", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "dead", kind: "install", title: "t" }, env);
    const record = readLockRecord();
    writeFileSync(
      lockPath,
      JSON.stringify({
        ...record,
        heartbeatAt: env.now() + FUTURE_SKEW_MS + 1_000,
      }),
    );
    expect(inspectLock(lockPath, env).state).toBe("stale");
  });

  it("interleaving: a reaped holder is fenced and cannot release the new owner's lock", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "old", kind: "install", title: "t" }, env);
    env.advance(STALE_MS + 1_000);

    // New acquirer reaps and takes over while "old" is suspended.
    const taken = acquireLock(lockPath, { opId: "new", kind: "upgrade", title: "t2" }, env);
    expect(taken.status).toBe("acquired");

    // "old" wakes up: every privileged action must fail without side effects.
    expect(heartbeatLock(lockPath, "old", env)).toBe("fenced");
    expect(registerWingetPid(lockPath, "old", 999)).toBe("fenced");
    expect(releaseLock(lockPath, "old")).toBe(false);
    expect(readLockRecord().opId).toBe("new");
  });

  it("interleaving: exactly one of two competing acquirers wins a stale lock", () => {
    const env = makeEnv();
    acquireLock(lockPath, { opId: "dead", kind: "install", title: "t" }, env);
    env.advance(STALE_MS + 1_000);

    const first = acquireLock(lockPath, { opId: "r1", kind: "upgrade", title: "t1" }, env);
    const second = acquireLock(lockPath, { opId: "r2", kind: "upgrade", title: "t2" }, env);

    expect(first.status).toBe("acquired");
    expect(second.status).toBe("busy");
    expect(second.status === "busy" && second.holder?.opId).toBe("r1");
    expect(readLockRecord().opId).toBe("r1");
  });
});

describe("unreadable lock files", () => {
  it("treats fresh garbage as held and old garbage as stale", () => {
    const env = makeEnv({ now: () => Date.now() });
    writeFileSync(lockPath, "{ torn json");
    expect(inspectLock(lockPath, env).state).toBe("held");

    const oldTime = new Date(Date.now() - 60_000);
    utimesSync(lockPath, oldTime, oldTime);
    expect(inspectLock(lockPath, env).state).toBe("stale");
  });

  it("reaps an old unreadable lock on acquire", () => {
    const env = makeEnv({ now: () => Date.now() });
    writeFileSync(lockPath, "{ torn json");
    const oldTime = new Date(Date.now() - 60_000);
    utimesSync(lockPath, oldTime, oldTime);

    const result = acquireLock(lockPath, { opId: "new", kind: "install", title: "t" }, env);
    expect(result.status).toBe("acquired");
    expect(readLockRecord().opId).toBe("new");
  });
});
