import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, readdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOCK_STALE_MS, fileLock } from "../src/lib/lock.ts";
import { abortableSleep } from "../src/lib/time.ts";

const clock = { now: () => Date.now(), sleep: (ms: number) => abortableSleep(ms) };

async function directory() {
  return mkdtemp(join(tmpdir(), "socialfaktory-lock-"));
}

describe("fileLock", () => {
  it("lets one holder in at a time across separate lock instances", async () => {
    const path = await directory();
    const inside: string[] = [];
    let overlaps = 0;
    const hold = (name: string) =>
      fileLock(path, clock)("slot", async () => {
        if (inside.length > 0) overlaps += 1;
        inside.push(name);
        await abortableSleep(20);
        inside.pop();
      });

    await Promise.all(["a", "b", "c", "d"].map(hold));

    assert.equal(overlaps, 0);
    assert.deepEqual(await readdir(path), []);
  });

  it("does not make different names wait for each other", async () => {
    const lock = fileLock(await directory(), clock);
    let second = false;

    await lock("first", async () => {
      await lock("second", async () => {
        second = true;
      });
    });

    assert.equal(second, true);
  });

  it("releases the lock when the work throws", async () => {
    const path = await directory();
    const lock = fileLock(path, clock);

    await assert.rejects(
      lock("slot", async () => Promise.reject(new Error("boom"))),
      /boom/,
    );

    assert.deepEqual(await readdir(path), []);
    assert.equal(await lock("slot", async () => "again"), "again");
  });

  it("waits while another process holds a fresh lock", async () => {
    const path = await directory();
    await writeFile(join(path, "slot.lock"), "other-process");
    let entered = false;

    const waiting = fileLock(path, clock)("slot", async () => {
      entered = true;
    });
    await abortableSleep(200);

    assert.equal(entered, false);
    const old = (Date.now() - LOCK_STALE_MS - 1_000) / 1_000;
    await utimes(join(path, "slot.lock"), old, old);
    await waiting;
    assert.equal(entered, true);
  });

  it("takes over a lock left behind by a process that died", async () => {
    const path = await directory();
    await writeFile(join(path, "slot.lock"), "dead-process");
    const old = (Date.now() - LOCK_STALE_MS - 1_000) / 1_000;
    await utimes(join(path, "slot.lock"), old, old);

    assert.equal(await fileLock(path, clock)("slot", async () => "taken"), "taken");
    assert.deepEqual(await readdir(path), []);
  });

  it("lets only one of several waiters take over a lock left behind", async () => {
    for (let round = 0; round < 10; round += 1) {
      const path = await directory();
      await writeFile(join(path, "slot.lock"), "dead-process");
      const old = (Date.now() - LOCK_STALE_MS - 1_000) / 1_000;
      await utimes(join(path, "slot.lock"), old, old);
      let inside = 0;
      let overlaps = 0;
      const hold = () =>
        fileLock(path, clock)("slot", async () => {
          inside += 1;
          if (inside > 1) overlaps += 1;
          await abortableSleep(5);
          inside -= 1;
        });

      await Promise.all(Array.from({ length: 8 }, hold));

      assert.equal(overlaps, 0);
      assert.deepEqual(await readdir(path), []);
    }
  });

  it("leaves a lock another holder took in place when releasing", async () => {
    const path = await directory();

    await fileLock(path, clock)("slot", async () => {
      await writeFile(join(path, "slot.lock"), "next-holder");
    });

    assert.deepEqual(await readdir(path), ["slot.lock"]);
  });
});
