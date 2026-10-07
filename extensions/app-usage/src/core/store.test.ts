import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { createStore, localDateKey, localHour, shiftDays, splitByHour } from "./store";

let root = "";

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "app-usage-test-"));
});

after(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

/** 14 Sep 2026, 10:30 local time. */
const AT = new Date(2026, 8, 14, 10, 30, 0).getTime();

describe("shiftDays", () => {
  it("moves by whole calendar days", () => {
    const at = new Date(2026, 8, 14, 10, 30).getTime();
    assert.equal(localDateKey(shiftDays(at, -30)), "2026-08-15");
    assert.equal(localDateKey(shiftDays(at, 1)), "2026-09-15");
  });

  it("crosses month and year boundaries", () => {
    assert.equal(localDateKey(shiftDays(new Date(2026, 0, 1, 12, 0).getTime(), -1)), "2025-12-31");
    assert.equal(localDateKey(shiftDays(new Date(2024, 1, 28, 12, 0).getTime(), 1)), "2024-02-29");
  });

  it("keeps the local time of day, which fixed-millisecond arithmetic does not across DST", () => {
    const at = new Date(2026, 2, 20, 0, 30).getTime();
    assert.equal(new Date(shiftDays(at, -30)).getHours(), 0);
    assert.equal(new Date(shiftDays(at, -30)).getMinutes(), 30);
  });
});

describe("splitByHour", () => {
  it("keeps a window inside one hour whole", () => {
    assert.deepEqual(splitByHour(AT, 60), [{ date: "2026-09-14", hour: 10, seconds: 60 }]);
  });

  it("splits a window that crosses the hour", () => {
    const start = new Date(2026, 8, 14, 11, 59, 30).getTime();
    assert.deepEqual(splitByHour(start, 60), [
      { date: "2026-09-14", hour: 11, seconds: 30 },
      { date: "2026-09-14", hour: 12, seconds: 30 },
    ]);
  });

  it("splits a window that crosses midnight into two dates", () => {
    const start = new Date(2026, 8, 14, 23, 59, 20).getTime();
    assert.deepEqual(splitByHour(start, 60), [
      { date: "2026-09-14", hour: 23, seconds: 40 },
      { date: "2026-09-15", hour: 0, seconds: 20 },
    ]);
  });

  it("never loses or invents a second to rounding", () => {
    const start = new Date(2026, 8, 14, 11, 59, 59, 600).getTime();
    const pieces = splitByHour(start, 45);
    assert.equal(
      pieces.reduce((sum, piece) => sum + piece.seconds, 0),
      45,
    );
  });
});

describe("store", () => {
  it("round-trips sampler state", async () => {
    const store = createStore(path.join(root, "state-case"));
    assert.equal(await store.readState(), null);

    await store.writeState({ v: 1, lastAt: AT, lastKey: "com.a", lastName: "A" });
    const state = await store.readState();
    assert.equal(state?.lastKey, "com.a");
    assert.equal(state?.lastAt, AT);
  });

  it("records seconds into the right day and hour bucket", async () => {
    const store = createStore(path.join(root, "record-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 40 }, idleSeconds: 0 });

    const day = await store.readDay(localDateKey(AT));
    assert.equal(day?.date, "2026-09-14");
    assert.equal(day?.apps["com.a"]?.hours[localHour(AT)], 40);
    assert.equal(day?.apps["com.a"]?.hours.length, 24);
  });

  it("accumulates repeated slices in the same bucket", async () => {
    const store = createStore(path.join(root, "accumulate-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 40 }, idleSeconds: 0 });
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 20 }, idleSeconds: 0 });

    const day = await store.readDay(localDateKey(AT));
    assert.equal(day?.apps["com.a"]?.hours[localHour(AT)], 60);
  });

  it("keeps apps and hours separate", async () => {
    const store = createStore(path.join(root, "separate-case"));
    const later = AT + 3 * 3_600_000;
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 40 }, idleSeconds: 0 });
    await store.record({ at: later, app: { key: "com.b", name: "B", seconds: 25 }, idleSeconds: 0 });

    const day = await store.readDay(localDateKey(AT));
    assert.equal(day?.apps["com.a"]?.hours[localHour(AT)], 40);
    assert.equal(day?.apps["com.b"]?.hours[localHour(later)], 25);
    assert.equal(day?.apps["com.b"]?.hours[localHour(AT)], 0);
  });

  it("refreshes the display name when an app is renamed", async () => {
    const store = createStore(path.join(root, "rename-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "Old Name", seconds: 10 }, idleSeconds: 0 });
    await store.record({ at: AT, app: { key: "com.a", name: "New Name", seconds: 10 }, idleSeconds: 0 });

    const day = await store.readDay(localDateKey(AT));
    assert.equal(day?.apps["com.a"]?.name, "New Name");
    assert.equal(day?.apps["com.a"]?.hours[localHour(AT)], 20);
  });

  it("lists recorded days in ascending order", async () => {
    const store = createStore(path.join(root, "list-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    await store.record({ at: AT - 2 * 86_400_000, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });

    assert.deepEqual(await store.listDays(), ["2026-09-12", "2026-09-14"]);
  });

  it("prunes days outside the retention window and keeps the rest", async () => {
    const store = createStore(path.join(root, "prune-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    await store.record({ at: AT - 10 * 86_400_000, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    await store.record({ at: AT - 100 * 86_400_000, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });

    const removed = await store.prune(30, AT);
    assert.equal(removed, 1);
    assert.deepEqual(await store.listDays(), ["2026-09-04", "2026-09-14"]);
  });

  it("keeps exactly as many dates as the retention setting, today included", async () => {
    const store = createStore(path.join(root, "prune-boundary-case"));
    for (const offset of [0, 29, 30]) {
      await store.record({ at: shiftDays(AT, -offset), app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    }

    assert.equal(await store.prune(30, AT), 1);
    assert.deepEqual(await store.listDays(), ["2026-08-16", "2026-09-14"]);
  });

  it("files a window that crosses midnight under both dates", async () => {
    const store = createStore(path.join(root, "midnight-case"));
    const start = new Date(2026, 8, 14, 23, 59, 30).getTime();
    await store.record({ at: start, app: { key: "com.a", name: "A", seconds: 40 }, idleSeconds: 20 });

    const before = await store.readDay("2026-09-14");
    const after = await store.readDay("2026-09-15");
    assert.equal(before?.apps["com.a"]?.hours[23], 30);
    assert.equal(after?.apps["com.a"]?.hours[0], 10);
    assert.equal(before?.idle, undefined, "idle closes the window, so it all lands after midnight");
    assert.equal(after?.idle?.[0], 20);
  });

  it("ignores a nonsensical retention value rather than deleting everything", async () => {
    const store = createStore(path.join(root, "retention-guard-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });

    assert.equal(await store.prune(0, AT), 0);
    assert.equal(await store.prune(Number.NaN, AT), 0);
    assert.equal((await store.listDays()).length, 1);
  });

  it("survives a corrupt day file instead of throwing", async () => {
    const dir = path.join(root, "corrupt-case");
    const store = createStore(dir);
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    await fs.writeFile(path.join(dir, "days", "2026-09-14.json"), "{ not json", "utf8");

    assert.equal(await store.readDay("2026-09-14"), null);
    // A later write starts the day over rather than failing.
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 5 }, idleSeconds: 0 });
    const day = await store.readDay("2026-09-14");
    assert.equal(day?.apps["com.a"]?.hours[localHour(AT)], 5);
  });

  it("records idle seconds into the same hour bucket", async () => {
    const store = createStore(path.join(root, "idle-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 40 }, idleSeconds: 20 });
    await store.record({ at: AT, app: null, idleSeconds: 60 });

    const day = await store.readDay(localDateKey(AT));
    assert.equal(day?.apps["com.a"]?.hours[localHour(AT)], 40);
    assert.equal(day?.idle?.[localHour(AT)], 80);
    assert.equal(day?.idle?.length, 24);
  });

  it("writes no idle array at all when nothing was idle", async () => {
    const store = createStore(path.join(root, "no-idle-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 60 }, idleSeconds: 0 });

    const day = await store.readDay(localDateKey(AT));
    assert.equal(day?.idle, undefined, "an older reader should see absent, not zero");
  });

  it("adds idle to a day file written before idle was recorded", async () => {
    const dir = path.join(root, "legacy-case");
    const store = createStore(dir);
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 60 }, idleSeconds: 0 });
    await store.record({ at: AT, app: null, idleSeconds: 30 });

    const day = await store.readDay(localDateKey(AT));
    assert.equal(day?.idle?.[localHour(AT)], 30);
    assert.equal(day?.apps["com.a"]?.hours[localHour(AT)], 60, "the existing app data survives");
  });

  it("leaves no temp files behind", async () => {
    const dir = path.join(root, "atomic-case");
    const store = createStore(dir);
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    await store.writeState({ v: 1, lastAt: AT, lastKey: "com.a", lastName: "A" });

    const dayFiles = await fs.readdir(path.join(dir, "days"));
    const rootFiles = await fs.readdir(dir);
    assert.ok(!dayFiles.some((f) => f.endsWith(".tmp")));
    assert.ok(!rootFiles.some((f) => f.endsWith(".tmp")));
  });

  it("lets a clear win against a sample that read the files before it", async () => {
    const store = createStore(path.join(root, "clear-race-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    await store.writeState({ v: 1, lastAt: AT, lastKey: "com.a", lastName: "A" });

    let locked!: () => void;
    let release!: () => void;
    const holding = new Promise<void>((resolve) => (locked = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));

    const sample = store.ifUnlocked(async () => {
      const state = await store.readState();
      locked();
      await gate;
      // Writes back what it read before the clear started.
      await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 60 }, idleSeconds: 0 });
      if (state) await store.writeState(state);
    });

    await holding;
    const cleared = store.clear();
    release();
    await Promise.all([sample, cleared]);

    assert.deepEqual(await store.listDays(), []);
    assert.equal(await store.readState(), null);
  });

  it("makes a sample skip its turn while the lock is held", async () => {
    const store = createStore(path.join(root, "lock-busy-case"));
    let locked!: () => void;
    let release!: () => void;
    const holding = new Promise<void>((resolve) => (locked = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));

    const first = store.ifUnlocked(async () => {
      locked();
      await gate;
    });
    await holding;

    let ran = false;
    assert.equal(
      await store.ifUnlocked(async () => {
        ran = true;
      }),
      false,
    );
    assert.equal(ran, false);

    release();
    assert.equal(await first, true);
    assert.equal(await store.ifUnlocked(async () => {}), true, "the lock is released afterwards");
  });

  it("breaks a lock left behind by a crash", async () => {
    const dir = path.join(root, "stale-lock-case");
    const store = createStore(dir);
    await fs.mkdir(path.join(dir, "lock"), { recursive: true });
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(path.join(dir, "lock"), old, old);

    assert.equal(await store.ifUnlocked(async () => {}), true);
  });

  it("erases everything on clear", async () => {
    const store = createStore(path.join(root, "clear-case"));
    await store.record({ at: AT, app: { key: "com.a", name: "A", seconds: 10 }, idleSeconds: 0 });
    await store.writeState({ v: 1, lastAt: AT, lastKey: "com.a", lastName: "A" });

    await store.clear();
    assert.deepEqual(await store.listDays(), []);
    assert.equal(await store.readState(), null);
  });
});
