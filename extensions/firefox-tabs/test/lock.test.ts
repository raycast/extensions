import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { withLock } from "../src/lib/lock.ts";

let dir: string;
let lock: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "raycast-firefox-lock-"));
  lock = join(dir, "update.lock");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("withLock", () => {
  test("runs the function and releases the lock", async () => {
    const result = await withLock(lock, async () => 42);
    assert.deepEqual(result, { ran: true, value: 42 });
    assert.equal(existsSync(lock), false);
  });

  test("doesn't run while another command holds the lock", async () => {
    let ran = false;
    const outer = await withLock(lock, async () => {
      const inner = await withLock(lock, async () => {
        ran = true;
      });
      return inner;
    });
    assert.deepEqual(outer, { ran: true, value: { ran: false } });
    assert.equal(ran, false);
  });

  test("releases the lock when the function throws", async () => {
    await assert.rejects(
      withLock(lock, async () => {
        throw new Error("install failed");
      }),
      /install failed/
    );
    assert.equal(existsSync(lock), false);
  });

  test("creates the folder it lives in, which doesn't exist on a fresh machine", async () => {
    const fresh = join(dir, "home", ".raycast-firefox", "update.lock");
    const result = await withLock(fresh, async () => "installed");
    assert.deepEqual(result, { ran: true, value: "installed" });
    assert.equal(existsSync(fresh), false);
  });

  test("leaves nothing behind after taking over a stale lock", async () => {
    mkdirSync(lock);
    const old = (Date.now() - 10 * 60 * 1000) / 1000;
    utimesSync(lock, old, old);
    await withLock(lock, async () => undefined);
    assert.deepEqual(readdirSync(dir), []);
  });

  test("takes over a lock left by a run that died", async () => {
    mkdirSync(lock);
    const old = (Date.now() - 10 * 60 * 1000) / 1000;
    utimesSync(lock, old, old);
    const result = await withLock(lock, async () => "took over");
    assert.deepEqual(result, { ran: true, value: "took over" });
  });

  test("respects a recent lock", async () => {
    mkdirSync(lock);
    const result = await withLock(lock, async () => "should not run");
    assert.deepEqual(result, { ran: false });
    assert.equal(existsSync(lock), true, "leaves the other command's lock in place");
  });
});

describe("withLock takeover race", () => {
  test("steps aside if another command took over the stale lock first, and leaves its lock in place", async () => {
    // A stale lock is found; before it is moved aside, another command
    // replaces it with a fresh lock of its own.
    mkdirSync(lock);
    const old = (Date.now() - 10 * 60 * 1000) / 1000;
    utimesSync(lock, old, old);
    let swapped = false;
    const stat = (path: string) => {
      const result = statSync(path);
      if (!swapped && path === lock) {
        swapped = true;
        rmSync(lock, { recursive: true });
        mkdirSync(lock); // the other command's fresh lock
      }
      return result;
    };
    let ran = false;
    const result = await withLock(
      lock,
      async () => {
        ran = true;
      },
      { stat }
    );
    assert.deepEqual(result, { ran: false });
    assert.equal(ran, false);
    assert.equal(existsSync(lock), true, "the other command's lock is put back");
    assert.deepEqual(
      readdirSync(dir).filter((n) => n.includes(".stale-")),
      [],
      "nothing left aside"
    );
  });
});
