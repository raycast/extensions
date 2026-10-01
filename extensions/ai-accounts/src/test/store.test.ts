import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import {
  acquireLock,
  LOCK_LEASE_MS,
  LockHandle,
  providerLockHeld,
  readOperations,
  readSnapshot,
  refreshProvider,
  upsertOperation,
} from "../lib/store";
import { ProviderFetch } from "../lib/model";

const tmpDirs: string[] = [];
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-accounts-store-"));
  tmpDirs.push(dir);
  return dir;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function lockPath(dir: string, name = "provider-claude"): string {
  return path.join(dir, `${name}.lock`);
}

function readLock(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** A lock left by a worker that stopped heartbeating `silentMs` ago. */
function writeAbandoned(file: string, token: string, silentMs: number, extra: Record<string, unknown> = {}): void {
  const at = Date.now() - silentMs;
  fs.writeFileSync(file, JSON.stringify({ token, purpose: "refresh", createdAt: at, heartbeatAt: at, ...extra }));
}

function deadPid(): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", () => resolve(child.pid!));
  });
}

/** Only the lock and the data files remain: no guard markers, moved-aside markers or temp files. */
function assertNoDebris(dir: string): void {
  const debris = fs.readdirSync(dir).filter((f) => f.includes(".reclaim") || f.endsWith(".tmp"));
  assert.deepEqual(debris, []);
}

// ---------------------------------------------------------------------------
// Heartbeat lease

test("a lock whose holder stopped heartbeating is reclaimed once the lease runs out, not before", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  writeAbandoned(file, "dead", LOCK_LEASE_MS - 3_000);
  assert.equal(await acquireLock(dir, "provider-claude", { purpose: "switch" }), null);

  writeAbandoned(file, "dead", LOCK_LEASE_MS + 1_000);
  const h = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(h);
  assert.equal(readLock(file).token, h.token);
  h.release();

  // a lock body from before heartbeats (createdAt only) ages out the same way
  const old = Date.now() - LOCK_LEASE_MS - 1_000;
  fs.writeFileSync(file, JSON.stringify({ token: "legacy", purpose: "refresh", createdAt: old }));
  const h2 = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(h2);
  h2.release();
  assert.equal(fs.existsSync(file), false);
  assertNoDebris(dir);
});

test("a terminated worker's lock is reclaimed within the lease, while a live worker's lock is not", async () => {
  const dir = tmpDir();
  const worker = new Worker(
    `
    const { parentPort, workerData } = require("node:worker_threads");
    require("tsx/cjs/api").register();
    const store = require(workerData.store);
    store
      .acquireLock(workerData.dir, "provider-claude", { purpose: "refresh", heartbeatMs: 50 })
      .then((h) => parentPort.postMessage(h ? h.token : null), (e) => parentPort.postMessage("ERR " + e.message));
    setInterval(() => {}, 1000); // the command keeps running; the heartbeat timer itself is unref'd
    `,
    { eval: true, workerData: { dir, store: path.join(__dirname, "../lib/store.ts") } },
  );
  try {
    const token = await new Promise((resolve) => worker.once("message", resolve));
    assert.equal(typeof token, "string");
    assert.doesNotMatch(String(token), /^ERR/);
    // The worker is alive and heartbeating: a reclaimer with a 400 ms lease still cannot take it in 1 s.
    const blocked = await acquireLock(dir, "provider-claude", { purpose: "switch", staleMs: 400, waitMs: 1_000 });
    assert.equal(blocked, null);
    assert.equal(readLock(lockPath(dir)).token, token);
  } finally {
    await worker.terminate(); // Raycast unloads the command: no finally, no release
  }
  assert.ok(fs.existsSync(lockPath(dir)));
  const started = Date.now();
  const h = await acquireLock(dir, "provider-claude", { purpose: "switch", staleMs: 400, waitMs: 5_000 });
  assert.ok(h);
  assert.ok(Date.now() - started < 2_000, `reclaimed after ${Date.now() - started} ms`);
  h.release();
  assertNoDebris(dir);
});

test("the holder's heartbeat refreshes the lease and keeps createdAt", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  const h = await acquireLock(dir, "provider-claude", { purpose: "switch", heartbeatMs: 40 });
  assert.ok(h);
  const first = readLock(file);
  await sleep(200);
  const later = readLock(file);
  assert.equal(later.token, h.token);
  assert.equal(later.createdAt, first.createdAt);
  assert.ok((later.heartbeatAt as number) > (first.heartbeatAt as number));
  h.release();
  assert.equal(fs.existsSync(file), false);
  assertNoDebris(dir);
});

test("a live holder whose child exited keeps its lock, however long ago it started", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  const h = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(h);
  try {
    const pid = await deadPid();
    h.setChildPid(pid); // the cswap --switch-to child ran and exited; verification continues
    const body = readLock(file);
    assert.equal(body.childPid, pid);
    body.createdAt = (body.createdAt as number) - 60_000; // the switch began a minute ago
    fs.writeFileSync(file, JSON.stringify(body));
    const other = await acquireLock(dir, "provider-claude", { purpose: "refresh", waitMs: 400 });
    assert.equal(other, null);
    assert.equal(readLock(file).token, h.token);
  } finally {
    h.release();
  }
  assert.equal(fs.existsSync(file), false);
});

test("a dead holder's still-running child keeps the lock; once the child is gone it is reclaimed", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  writeAbandoned(file, "dead", LOCK_LEASE_MS + 5_000, { purpose: "switch", childPid: process.pid });
  assert.equal(await acquireLock(dir, "provider-claude", { purpose: "refresh" }), null);

  writeAbandoned(file, "dead", LOCK_LEASE_MS + 5_000, { purpose: "switch", childPid: await deadPid() });
  const h = await acquireLock(dir, "provider-claude", { purpose: "refresh" });
  assert.ok(h);
  h.release();

  // pid 0 would address the process group (always "alive"); it never keeps a lock
  writeAbandoned(file, "dead", LOCK_LEASE_MS + 5_000, { purpose: "switch", childPid: 0 });
  const h0 = await acquireLock(dir, "provider-claude", { purpose: "refresh" });
  assert.ok(h0);
  h0.release();

  // a live pid long after the heartbeat stopped is treated as reused, not as the switch child
  writeAbandoned(file, "dead", 16 * 60_000, { purpose: "switch", childPid: process.pid });
  const h2 = await acquireLock(dir, "provider-claude", { purpose: "refresh" });
  assert.ok(h2);
  h2.release();
});

test("an unreadable lock is left alone while fresh and reclaimed once a few seconds old", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  fs.writeFileSync(file, ""); // creator died between create and write, or is writing right now
  assert.equal(await acquireLock(dir, "provider-claude", { purpose: "switch" }), null);
  const old = new Date(Date.now() - 6_000);
  fs.utimesSync(file, old, old);
  const h = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(h);
  h.release();
  assertNoDebris(dir);
});

test("a dead state-lock holder does not wedge state writes", async () => {
  const dir = tmpDir();
  writeAbandoned(path.join(dir, "state.lock"), "dead", 6_000, { purpose: "state" });
  await upsertOperation(dir, {
    requestId: "r1",
    provider: "codex",
    targetKey: "codex:x@example.com|",
    targetLabel: "x",
    state: "failed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    message: "m",
  });
  assert.equal(readOperations(dir)[0].requestId, "r1");
  assert.equal(fs.existsSync(path.join(dir, "state.lock")), false);
});

// ---------------------------------------------------------------------------
// Exclusive reclaim and safe release

test("two reclaimers of one stale lock cannot both win: one reclaims before the other enters", async () => {
  const dir = tmpDir();
  const file = lockPath(dir, "provider-codex");
  const marker = `${file}.reclaim`;
  writeAbandoned(file, "dead", 200_000, { purpose: "switch" });
  const realOpen = fs.openSync;
  let injected = false;
  let pA: Promise<LockHandle | null> | null = null;
  const patched = function (this: unknown, ...args: Parameters<typeof fs.openSync>) {
    if (!injected && args[0] === marker) {
      injected = true;
      // Reclaimer A judges the same lock stale and runs its whole reclaim and create between
      // reclaimer B's stale judgement and B's entry into the exclusive section.
      pA = acquireLock(dir, "provider-codex", { purpose: "refresh" });
    }
    return realOpen.apply(fs, args);
  };
  (fs as { openSync: unknown }).openSync = patched;
  let hB: LockHandle | null;
  try {
    hB = await acquireLock(dir, "provider-codex", { purpose: "switch" });
  } finally {
    (fs as { openSync: unknown }).openSync = realOpen;
  }
  assert.ok(injected);
  const hA = await pA!;
  assert.ok(hA, "A reclaimed the stale lock");
  assert.equal(hB, null, "B must not remove A's fresh lock");
  assert.equal(readLock(file).token, hA.token);
  hA.release();
  assert.equal(fs.existsSync(file), false);
  assertNoDebris(dir);
});

test("two reclaimers of one stale lock cannot both win: the second cannot enter while the first removes it", async () => {
  const dir = tmpDir();
  const file = lockPath(dir, "provider-codex");
  writeAbandoned(file, "dead", 200_000, { purpose: "switch" });
  const realUnlink = fs.unlinkSync;
  let injected = false;
  let pA: Promise<LockHandle | null> | null = null;
  const patched = function (this: unknown, ...args: Parameters<typeof fs.unlinkSync>) {
    if (!injected && args[0] === file) {
      injected = true;
      // Reclaimer A arrives while B is inside the exclusive section, about to remove the stale lock.
      pA = acquireLock(dir, "provider-codex", { purpose: "refresh" });
    }
    return realUnlink.apply(fs, args);
  };
  (fs as { unlinkSync: unknown }).unlinkSync = patched;
  let hB: LockHandle | null;
  try {
    hB = await acquireLock(dir, "provider-codex", { purpose: "switch" });
  } finally {
    (fs as { unlinkSync: unknown }).unlinkSync = realUnlink;
  }
  assert.ok(injected);
  const hA = await pA!;
  assert.ok(hB, "B reclaimed the stale lock");
  assert.equal(hA, null, "A must not also hold it");
  assert.equal(readLock(file).token, hB.token);
  hB.release();
  assertNoDebris(dir);
});

test("a guard marker left by a terminated worker is broken; a live one blocks reclaim until it is gone", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  const marker = `${file}.reclaim`;
  writeAbandoned(file, "dead", 200_000);
  fs.writeFileSync(marker, JSON.stringify({ nonce: "other", at: Date.now() }));
  assert.equal(await acquireLock(dir, "provider-claude", { purpose: "switch" }), null);
  assert.equal(readLock(file).token, "dead");

  fs.writeFileSync(marker, JSON.stringify({ nonce: "killed", at: Date.now() - 60_000 }));
  const h = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(h);
  h.release();

  // an unreadable marker is judged by its age on disk
  writeAbandoned(file, "dead", 200_000);
  fs.writeFileSync(marker, "");
  const old = new Date(Date.now() - 60_000);
  fs.utimesSync(marker, old, old);
  const h2 = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(h2);
  h2.release();
  assertNoDebris(dir);
});

test("release never removes a lock that is no longer the holder's", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  const hA = await acquireLock(dir, "provider-claude", { purpose: "refresh", heartbeatMs: 60_000 });
  assert.ok(hA);
  await sleep(60);
  // A's worker stalled past B's (short) lease, so B reclaimed it.
  const hB = await acquireLock(dir, "provider-claude", { purpose: "switch", staleMs: 20 });
  assert.ok(hB);
  hA.release();
  assert.equal(readLock(file).token, hB.token);
  hB.release();
  assert.equal(fs.existsSync(file), false);

  // missing: nothing to do; unreadable (someone else's create in progress): never removed
  const hC = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(hC);
  fs.unlinkSync(file);
  hC.release();
  assert.equal(fs.existsSync(file), false);
  const hD = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(hD);
  fs.writeFileSync(file, "");
  hD.release();
  assert.equal(fs.existsSync(file), true);
  fs.unlinkSync(file);
  assertNoDebris(dir);
});

test("a holder whose lock was reclaimed stops heartbeating and never overwrites the successor", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  const hA = await acquireLock(dir, "provider-claude", { purpose: "refresh", heartbeatMs: 300 });
  assert.ok(hA);
  await sleep(50);
  const hB = await acquireLock(dir, "provider-claude", { purpose: "switch", staleMs: 20 });
  assert.ok(hB);
  const successor = readLock(file);
  await sleep(800); // A's heartbeat fires twice here
  const now = readLock(file);
  assert.equal(now.token, hB.token);
  assert.equal(now.purpose, "switch");
  assert.equal(now.createdAt, successor.createdAt);
  hA.setChildPid(process.pid); // A's late bookkeeping must not touch B's lock either
  assert.equal(readLock(file).childPid, undefined);
  hA.release();
  hB.release();
  assert.equal(fs.existsSync(file), false);
  assertNoDebris(dir);
});

// ---------------------------------------------------------------------------
// A child left running past its caller's deadline (cswap is never signalled) keeps the lock until it exits.

/** A child that runs for `ms` and then exits; resolves its pid at once and `exited` when it is gone. */
function slowChild(ms: number): { pid: number; exited: Promise<void> } {
  const child = spawn(process.execPath, ["-e", `setTimeout(() => {}, ${ms})`], { stdio: "ignore" });
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  return { pid: child.pid!, exited };
}

test("a holder that releases while its recorded child still runs leaves the lock to that child until it exits", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  const h = await acquireLock(dir, "provider-claude", { purpose: "refresh" });
  assert.ok(h);
  const child = slowChild(700);
  h.setChildPid(child.pid);
  h.release();
  const body = readLock(file);
  assert.equal(body.token, h.token);
  assert.equal(typeof body.detachedAt, "number");
  assert.equal(providerLockHeld(dir, "claude"), true);
  assert.equal(await acquireLock(dir, "provider-claude", { purpose: "refresh" }), null);
  await child.exited;
  // Freed as soon as the child is gone, without waiting out the heartbeat lease.
  assert.equal(providerLockHeld(dir, "claude"), false);
  const next = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(next);
  next.release();
  assert.equal(fs.existsSync(file), false);
  assertNoDebris(dir);
});

test("a detached child keeps the lock for a bounded time only", async () => {
  const dir = tmpDir();
  const file = lockPath(dir);
  // process.pid stands in for a child that never exits.
  writeAbandoned(file, "done", 1_000, { childPid: process.pid, detachedAt: Date.now() - 60_000 });
  assert.equal(await acquireLock(dir, "provider-claude", { purpose: "refresh" }), null);
  writeAbandoned(file, "done", 1_000, { childPid: process.pid, detachedAt: Date.now() - 121_000 });
  const h = await acquireLock(dir, "provider-claude", { purpose: "refresh" });
  assert.ok(h);
  h.release();
  assert.equal(fs.existsSync(file), false);
});

test("refreshProvider records the fetch's child; a fetch that gave up on a running child keeps the lock busy", async () => {
  const dir = tmpDir();
  const child = slowChild(900);
  const outcome = await refreshProvider(dir, "claude", async (hooks) => {
    hooks.onSpawn?.(child.pid);
    throw new Error("claude-swap is still refreshing; showing previous readings");
  });
  assert.equal(outcome.kind, "failed");
  assert.equal(
    readSnapshot(dir).providers.claude.lastError,
    "claude-swap is still refreshing; showing previous readings",
  );
  assert.equal(readLock(lockPath(dir)).childPid, child.pid);
  let fetches = 0;
  const fetcher = async (): Promise<ProviderFetch> => {
    fetches += 1;
    return { provider: "claude", source: "cswap", accounts: [], notices: [] };
  };
  assert.deepEqual(await refreshProvider(dir, "claude", fetcher), { kind: "busy" });
  assert.equal(fetches, 0, "no second backend run starts over the running child");
  await child.exited;
  assert.equal((await refreshProvider(dir, "claude", fetcher)).kind, "committed");
  assert.equal(fetches, 1);
  assert.equal(fs.existsSync(lockPath(dir)), false);
});

test("providerLockHeld: held while live, not after release or once abandoned", async () => {
  const dir = tmpDir();
  assert.equal(providerLockHeld(dir, "codex"), false);
  const h = await acquireLock(dir, "provider-codex", { purpose: "switch" });
  assert.ok(h);
  assert.equal(providerLockHeld(dir, "codex"), true);
  assert.equal(providerLockHeld(dir, "claude"), false);
  h.release();
  assert.equal(providerLockHeld(dir, "codex"), false);
  writeAbandoned(lockPath(dir, "provider-codex"), "dead", LOCK_LEASE_MS + 1_000);
  assert.equal(providerLockHeld(dir, "codex"), false);
});

test("a zombie child (terminated worker never reaped it) does not keep a lock alive", async () => {
  const { acquireLock, setProcessStateReader, readProcessState } = await import("../lib/store");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-accounts-zombie-"));
  const original = readProcessState;
  try {
    // A lock whose holder stopped heartbeating long ago, with a recorded child pid that is "alive" to kill(0)
    // (our own pid) but reported as a zombie by ps.
    const old = Date.now() - 60_000;
    fs.writeFileSync(
      path.join(dir, "provider-claude.lock"),
      JSON.stringify({
        token: "dead",
        purpose: "refresh",
        ownerTag: "x",
        createdAt: old,
        heartbeatAt: old,
        childPid: process.pid,
      }),
    );
    setProcessStateReader(() => "Z");
    const lock = await acquireLock(dir, "provider-claude", { purpose: "switch", waitMs: 0 });
    assert.ok(lock, "zombie child must not hold the lock");
    lock!.release();
    // Same lock, but the child is really running: it keeps the lock.
    fs.writeFileSync(
      path.join(dir, "provider-claude.lock"),
      JSON.stringify({
        token: "live",
        purpose: "refresh",
        ownerTag: "x",
        createdAt: old,
        heartbeatAt: old,
        childPid: process.pid,
      }),
    );
    setProcessStateReader(() => "S");
    const blocked = await acquireLock(dir, "provider-claude", { purpose: "switch", waitMs: 0 });
    assert.equal(blocked, null, "a running child keeps the lock");
  } finally {
    setProcessStateReader(original);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
