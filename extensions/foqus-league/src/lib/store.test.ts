import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { LocalSessionStore, MAX_NOTES, parseSession, pruneDeleted, type SyncState } from "./store.ts";
import type { Session } from "./types.ts";

const DAY = 86_400_000;
const NOW = Date.now();
const T1 = NOW - 3 * DAY;
const T2 = T1 + 4 * 3_600_000;
const T3 = NOW - 2 * DAY;

const at = (start: number, goal = "Ship", duration = 25): Session => ({ start, goal, duration, source: "reported" });
const manual = (start: number, goal: string, duration: number): Session => ({
  start,
  goal,
  duration,
  source: "manual",
});

async function withStore(fn: (store: LocalSessionStore, dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foqus-store-"));
  try {
    await fn(new LocalSessionStore(dir), dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const sessionsFile = (dir: string) => path.join(dir, "sessions.jsonl");
const stateFile = (dir: string) => path.join(dir, "state.json");

const readLines = async (dir: string) =>
  (await fs.readFile(sessionsFile(dir), "utf8")).split("\n").filter((line) => line.trim());

const starts = (sessions: Session[]) => sessions.map((s) => s.start);

const exists = async (file: string) => !!(await fs.stat(file).catch(() => null));

class CountingStore extends LocalSessionStore {
  stateWrites = 0;

  async writeState(state: SyncState): Promise<void> {
    this.stateWrites++;
    await super.writeState(state);
  }
}

test("a move onto an occupied start refuses and leaves both sessions untouched", async () => {
  await withStore(async (store, dir) => {
    await store.add([at(T1, "Write"), at(T2, "Read")]);
    const before = await readLines(dir);

    const result = await store.saveSession({ previousStart: T1, session: manual(T2, "Write", 40) });

    assert.deepEqual(result, { ok: false, reason: "collision", start: T2 });
    assert.deepEqual(await readLines(dir), before);
    assert.deepEqual(starts(await store.all()), [T1, T2]);
    assert.deepEqual(starts(await new LocalSessionStore(dir).all()), [T1, T2]);
    assert.ok(!(await store.readState()).deleted.includes(T1));
    assert.equal(await exists(stateFile(dir)), false);
  });
});

test("a move onto a tombstoned start succeeds and lifts the tombstone", async () => {
  await withStore(async (store, dir) => {
    await store.add([at(T1, "Write"), at(T2, "Read")]);
    await store.remove(T2);

    const result = await store.saveSession({ previousStart: T1, session: manual(T2, "Write", 40) });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(await store.all(), [manual(T2, "Write", 40)]);
    assert.deepEqual(await new LocalSessionStore(dir).all(), [manual(T2, "Write", 40)]);

    const state = await store.readState();
    assert.ok(state.deleted.includes(T1), "the start it moved off is tombstoned");
    assert.ok(!state.deleted.includes(T2), "the start it moved onto is not");

    assert.equal(await store.add([at(T2, "Read")]), 0, "a replayed sync event loses to the live record");
    assert.equal((await store.all()).length, 1);
  });
});

test("a plain add onto a tombstoned start succeeds and lifts the tombstone", async () => {
  await withStore(async (store) => {
    await store.add([at(T1, "Write")]);
    await store.remove(T1);
    assert.deepEqual((await store.readState()).deleted, [T1]);

    const result = await store.saveSession({ session: manual(T1, "Redo", 15) });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual((await store.readState()).deleted, []);
    assert.deepEqual(await store.all(), [manual(T1, "Redo", 15)]);
  });
});

test("a plain add onto a live start refuses and leaves the record byte-identical", async () => {
  await withStore(async (store, dir) => {
    await store.add([at(T1, "Write", 25)]);
    const before = await readLines(dir);

    const result = await store.saveSession({ session: manual(T1, "Other", 5) });

    assert.deepEqual(result, { ok: false, reason: "collision", start: T1 });
    assert.deepEqual(await readLines(dir), before);
    assert.deepEqual(await store.all(), [at(T1, "Write", 25)]);
  });
});

test("an edit in place changes the fields and tombstones nothing", async () => {
  await withStore(async (store) => {
    await store.add([at(T1, "Write", 25), at(T3, "Read", 30)]);

    const result = await store.saveSession({ previousStart: T1, session: manual(T1, "Write More", 45) });

    assert.deepEqual(result, { ok: true });
    const all = await store.all();
    assert.equal(all.length, 2);
    assert.deepEqual(starts(all), [T1, T3]);
    assert.deepEqual(all[0], manual(T1, "Write More", 45));
    assert.deepEqual(all[1], at(T3, "Read", 30));
    assert.deepEqual((await store.readState()).deleted, []);
  });
});

test("editing a session that is no longer on record refuses instead of silently recreating it", async () => {
  await withStore(async (_seed, dir) => {
    const elsewhere = new LocalSessionStore(dir);
    await elsewhere.add([at(T1, "Write"), at(T3, "Read")]);
    await elsewhere.remove(T1);

    const store = new LocalSessionStore(dir);
    const result = await store.saveSession({ previousStart: T1, session: manual(T1, "Write More", 45) });

    assert.deepEqual(result, { ok: false, reason: "missing", start: T1 });
    assert.deepEqual(starts(await store.all()), [T3]);
    assert.deepEqual(starts(await new LocalSessionStore(dir).all()), [T3]);
  });
});

test("a move keeps the file sorted and the cache in step with a fresh reader", async () => {
  await withStore(async (store, dir) => {
    await store.add([at(T1), at(T2), at(T3)]);
    const later = T3 + 3_600_000;

    const result = await store.saveSession({ previousStart: T1, session: manual(later, "Late", 20) });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(starts(await store.all()), [T2, T3, later]);
    assert.deepEqual(starts(await new LocalSessionStore(dir).all()), [T2, T3, later]);
  });
});

test("a refusal writes nothing at all, and a save writes the state document once", async () => {
  await withStore(async (_unused, dir) => {
    const store = new CountingStore(dir);
    await store.saveSession({ session: manual(T1, "Write", 25) });
    assert.equal(store.stateWrites, 1);

    const sessionsBefore = await fs.readFile(sessionsFile(dir), "utf8");
    const stateBefore = await fs.readFile(stateFile(dir), "utf8");

    assert.deepEqual(await store.saveSession({ session: manual(T1, "Clash", 5) }), {
      ok: false,
      reason: "collision",
      start: T1,
    });
    assert.deepEqual(await store.saveSession({ previousStart: T2, session: manual(T2, "Ghost", 5) }), {
      ok: false,
      reason: "missing",
      start: T2,
    });

    assert.equal(store.stateWrites, 1, "neither refusal touched the state document");
    assert.equal(await fs.readFile(sessionsFile(dir), "utf8"), sessionsBefore);
    assert.equal(await fs.readFile(stateFile(dir), "utf8"), stateBefore);
  });
});

test("a tombstone blocks a replayed sync until it ages past what any log can reach", async () => {
  await withStore(async (store) => {
    await store.add([at(T1, "Write")]);
    await store.remove(T1);

    assert.equal(await store.add([at(T1, "Write")]), 0, "the sync path cannot resurrect it");
    const { deleted } = await store.readState();
    assert.deepEqual(deleted, [T1]);

    assert.deepEqual(pruneDeleted(deleted, T1 + 89 * DAY), [T1], "still guarded three months on");
    assert.deepEqual(pruneDeleted(deleted, T1 + 91 * DAY), []);
  });
});

test("pruneDeleted returns a sorted, deduped list and drops what no sync can reach", () => {
  const now = Date.UTC(2026, 0, 1);
  assert.deepEqual(pruneDeleted([], now), []);
  assert.deepEqual(pruneDeleted([now - 3, now - 1, now - 2, now - 1], now), [now - 3, now - 2, now - 1]);
  assert.deepEqual(pruneDeleted([now - DAY, now - 200 * DAY], now), [now - DAY]);
  assert.deepEqual(pruneDeleted([now - 89 * DAY, now - 91 * DAY], now), [now - 89 * DAY]);
});

test("pruneDeleted caps the list by dropping the oldest survivors, never a young one", () => {
  const now = Date.UTC(2026, 0, 1);
  const all = Array.from({ length: 1100 }, (_, i) => now - (1100 - i) * 1000);

  const kept = pruneDeleted(all, now);

  assert.equal(kept.length, 1000);
  assert.equal(kept[0], all[100]);
  assert.equal(kept.at(-1), all.at(-1));
});

test("an unreadable state.json is rebuilt from empty rather than failing the save", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(stateFile(dir), "{ not json at all", "utf8");

    const result = await store.saveSession({ session: manual(T1, "Write", 25) });

    assert.deepEqual(result, { ok: true });
    const raw = JSON.parse(await fs.readFile(stateFile(dir), "utf8")) as SyncState;
    assert.equal(raw.version, 1);
    assert.equal(raw.cursor, null);
    assert.deepEqual(raw.deleted, []);
  });
});

test("a torn last line is dropped by the rewrite and no valid record goes with it", async () => {
  await withStore(async (seed, dir) => {
    await seed.add([at(T1, "Write"), at(T3, "Read")]);
    await fs.appendFile(sessionsFile(dir), '{"start":1234,"goal":"tor', "utf8");

    const store = new LocalSessionStore(dir);
    const result = await store.saveSession({ session: manual(T2, "New", 10) });

    assert.deepEqual(result, { ok: true });
    const lines = await readLines(dir);
    assert.equal(lines.length, 3);
    for (const line of lines) JSON.parse(line);
    assert.deepEqual(starts(await store.all()), [T1, T2, T3]);
  });
});

test("a save leaves no scratch files behind", async () => {
  await withStore(async (store, dir) => {
    await store.add([at(T1)]);
    await store.saveSession({ previousStart: T1, session: manual(T2, "Moved", 10) });

    assert.deepEqual((await fs.readdir(dir)).sort(), ["sessions.jsonl", "state.json"]);
  });
});

test("the store accepts what the form rejects — duration and start validation belong to the form", async () => {
  await withStore(async (store) => {
    const future = Date.now() + DAY;

    assert.deepEqual(await store.saveSession({ session: manual(future, "Later", 0) }), { ok: true });
    assert.deepEqual(await store.all(), [manual(future, "Later", 0)]);
  });
});

test("a save rewrites from disk, not from a cache warmed before another writer appended", async () => {
  await withStore(async (browsing, dir) => {
    await browsing.add([at(T1, "A"), at(T3, "B")]);
    assert.deepEqual(starts(await browsing.all()), [T1, T3]);

    await new LocalSessionStore(dir).add([at(T2, "Just finished")]);

    const result = await browsing.saveSession({ previousStart: T1, session: manual(T1, "A fixed", 30) });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(
      starts(await new LocalSessionStore(dir).all()),
      [T1, T2, T3],
      "the background session must survive an edit made from a stale cache",
    );
  });
});

test("a delete rewrites from disk, so a session recorded meanwhile is not taken with it", async () => {
  await withStore(async (browsing, dir) => {
    await browsing.add([at(T1, "A")]);
    await browsing.all();

    await new LocalSessionStore(dir).add([at(T2, "Just finished")]);
    await browsing.remove(T1);

    assert.deepEqual(starts(await new LocalSessionStore(dir).all()), [T2]);
  });
});

test("concurrent mutations are serialised instead of each rewriting from its own read", async () => {
  await withStore(async (store, dir) => {
    await Promise.all([
      store.add([at(T1, "A")]),
      store.saveSession({ session: manual(T2, "B", 10) }),
      store.add([at(T3, "C")]),
    ]);

    assert.deepEqual(starts(await new LocalSessionStore(dir).all()), [T1, T2, T3]);
  });
});

test("mutateState merges into the document on disk instead of overwriting it", async () => {
  await withStore(async (store, dir) => {
    await store.writeState({
      version: 1,
      cursor: 10,
      pending: [],
      streamOffset: 0,
      deleted: [],
      goalBlocks: {},
    });

    const snapshot = await store.readState();

    await new LocalSessionStore(dir).remove(T1);

    await store.mutateState((current) => ({ ...current, cursor: 99 }));

    const state = await new LocalSessionStore(dir).readState();
    assert.equal(state.cursor, 99);
    assert.deepEqual(state.deleted, [T1], "the tombstone written during the sync must survive it");
    assert.deepEqual(snapshot.deleted, [], "writing this snapshot back is exactly what used to lose it");
  });
});

test("a record missing the fields Session promises is skipped, not handed to the charts", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(
      sessionsFile(dir),
      [
        JSON.stringify(at(T1, "Write")),
        '{"start":' + T2 + ',"duration":25}',
        '{"start":"nope","goal":"Read","duration":25,"source":"reported"}',
        JSON.stringify(at(T3, "Read")),
      ].join("\n") + "\n",
      "utf8",
    );

    const kept = await store.all();
    assert.deepEqual(starts(kept), [T1, T3]);
    for (const s of kept) assert.equal(typeof s.goal, "string");
  });
});

test("a record with an unrecognised source keeps its minutes and is filed as manual", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(
      sessionsFile(dir),
      '{"start":' + T1 + ',"goal":"Write","duration":25,"source":"telepathy"}\n',
      "utf8",
    );

    assert.deepEqual(await store.all(), [manual(T1, "Write", 25)]);
  });
});

test("an open view sees a session another writer recorded, without being rebuilt", async () => {
  await withStore(async (viewing, dir) => {
    await viewing.add([at(T1, "A")]);
    assert.deepEqual(starts(await viewing.all()), [T1], "the view is warm on one session");

    await new LocalSessionStore(dir).add([at(T2, "Just finished")]);

    assert.equal(await viewing.add([]), 0);

    assert.deepEqual(
      starts(await viewing.all()),
      [T1, T2],
      "the new session must not stay invisible for the life of the view",
    );
  });
});

test("a refused save leaves the view agreeing with disk, not stuck on a session that is gone", async () => {
  await withStore(async (viewing, dir) => {
    const elsewhere = new LocalSessionStore(dir);
    await elsewhere.add([at(T1, "Write"), at(T3, "Read")]);
    await viewing.all();
    await elsewhere.remove(T1);

    const result = await viewing.saveSession({ previousStart: T1, session: manual(T1, "Write More", 45) });
    assert.deepEqual(result, { ok: false, reason: "missing", start: T1 });

    assert.deepEqual(starts(await viewing.all()), [T3]);
  });
});

test("a refused collision shows the session it refused on behalf of", async () => {
  await withStore(async (viewing, dir) => {
    await viewing.add([at(T1, "A")]);
    await viewing.all();
    await new LocalSessionStore(dir).add([at(T2, "Recorded meanwhile")]);

    const result = await viewing.saveSession({ previousStart: T1, session: manual(T2, "A moved", 30) });

    assert.deepEqual(result, { ok: false, reason: "collision", start: T2 });
    assert.deepEqual(
      starts(await viewing.all()),
      [T1, T2],
      "the user was told another session starts at that time, so the list has to show it",
    );
  });
});

test("a start outside the range Date can represent is skipped, not passed to the day arithmetic", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(
      sessionsFile(dir),
      [JSON.stringify(at(T1, "Write")), '{"start":1e20,"goal":"b","duration":30,"source":"manual"}'].join("\n") + "\n",
      "utf8",
    );

    assert.deepEqual(starts(await store.all()), [T1]);

    assert.equal(parseSession({ start: 1e20, goal: "b", duration: 30, source: "manual" }), null);
    assert.equal(parseSession({ start: -1e20, goal: "b", duration: 30, source: "manual" }), null);
    assert.ok(parseSession({ start: 8.64e15, goal: "b", duration: 30, source: "manual" }), "the boundary is allowed");
  });
});

test("notes are trimmed, capped and dropped when they are only whitespace", () => {
  const withNotes = (notes: unknown) => parseSession({ start: T1, goal: "b", duration: 30, source: "manual", notes });

  assert.equal(withNotes("  shipped the parser  ")?.notes, "shipped the parser");
  assert.equal(withNotes("two\nlines")?.notes, "two\nlines");
  assert.equal(withNotes("   ")?.notes, undefined);
  assert.equal(withNotes("")?.notes, undefined);
  assert.equal(withNotes(42)?.notes, undefined);
  assert.equal(withNotes("x".repeat(MAX_NOTES + 50))?.notes?.length, MAX_NOTES);
});

test("notes survive a write and read back through the store", async () => {
  await withStore(async (store) => {
    await store.saveSession({ session: { ...manual(T1, "Write", 30), notes: "chased a flaky test" } });

    const [session] = await store.all();
    assert.equal(session.notes, "chased a flaky test");
  });
});

test("a store with nothing on disk reads empty instead of throwing", async () => {
  await withStore(async (store, dir) => {
    assert.deepEqual(await store.all(), []);
    assert.equal(await store.count(), 0);
    assert.deepEqual(await store.readState(), {
      version: 1,
      cursor: null,
      pending: [],
      streamOffset: 0,
      deleted: [],
      goalBlocks: {},
    });
    assert.deepEqual(await fs.readdir(dir), [], "reading must not create the files either");
  });
});

test("a state document with wrong-typed fields is repaired field by field, not discarded", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(
      stateFile(dir),
      JSON.stringify({
        version: 1,
        cursor: "soon",
        pending: { nope: 1 },
        streamOffset: -5,
        deleted: [T1, "two", T3],
        goalBlocks: 7,
      }),
      "utf8",
    );

    const state = await store.readState();

    assert.equal(state.cursor, null);
    assert.deepEqual(state.pending, []);
    assert.equal(state.streamOffset, 0, "a negative offset would re-read bytes already consumed");
    assert.deepEqual(state.deleted, [T1, T3], "the tombstones that are numbers survive the junk beside them");
    assert.deepEqual(state.goalBlocks, {});
  });
});

test("goalBlocks written before categories carried titles are read back as Category rows", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(
      stateFile(dir),
      JSON.stringify({
        version: 1,
        goalBlocks: {
          "Deep work": { categories: ["social", "news"], mode: "block" },
          Reading: { categories: [{ id: "games", title: "Gaming" }, 7], mode: "allow", skipped: [{ id: "a.b.c" }] },
          Broken: "not an object",
        },
      }),
      "utf8",
    );

    const { goalBlocks } = await store.readState();

    assert.deepEqual(goalBlocks["Deep work"], {
      categories: [
        { id: "social", title: "social" },
        { id: "news", title: "news" },
      ],
      mode: "block",
      skipped: [],
    });
    assert.deepEqual(goalBlocks.Reading, {
      categories: [{ id: "games", title: "Gaming" }],
      mode: "allow",
      skipped: [{ id: "a.b.c", title: "a.b.c", app: false }],
    });
    assert.equal(goalBlocks.Broken, undefined, "an entry that is not an object at all is dropped");
  });
});

test("add ignores a start repeated inside one batch as well as one already on record", async () => {
  await withStore(async (store) => {
    assert.equal(await store.add([at(T1, "A"), at(T1, "A again"), at(T3, "B")]), 2);
    assert.deepEqual(starts(await store.all()), [T1, T3]);
    assert.equal((await store.all())[0].goal, "A", "the first of the batch wins");

    assert.equal(await store.add([at(T1, "A yet again"), at(T2, "C")]), 1);
    assert.deepEqual(starts(await store.all()), [T1, T2, T3]);
  });
});

test("a record whose duration is not a finite number is skipped, not tallied as NaN", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(
      sessionsFile(dir),
      [
        JSON.stringify(at(T1, "Write")),
        '{"start":' + T2 + ',"goal":"b","duration":null,"source":"manual"}',
        '{"start":' + T3 + ',"goal":"c","duration":"25","source":"manual"}',
      ].join("\n") + "\n",
      "utf8",
    );

    assert.deepEqual(starts(await store.all()), [T1]);
    assert.equal(parseSession({ start: T1, goal: "b", duration: Number.NaN, source: "manual" }), null);
    assert.equal(parseSession({ start: T1, goal: "b", duration: Number.POSITIVE_INFINITY, source: "manual" }), null);
  });
});

test("pending starts with junk beside them are read back one by one", async () => {
  await withStore(async (store, dir) => {
    await fs.writeFile(
      stateFile(dir),
      JSON.stringify({
        version: 1,
        pending: [{ at: T1, goal: "Writing", planned: 1500 }, { at: "soon", goal: "x" }, null, { at: T2 }, "junk"],
      }),
      "utf8",
    );

    assert.deepEqual((await store.readState()).pending, [{ at: T1, goal: "Writing", planned: 1500 }]);
  });
});

test("a write waits for another command's lock and sweeps one left by a dead process", () =>
  withStore(async (store, dir) => {
    const lock = path.join(dir, "store.lock");
    await fs.writeFile(lock, "");
    let settled = false;
    const waiting = store.add([at(T1)]).then((n) => {
      settled = true;
      return n;
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(settled, false, "the write does not start while another process holds the lock");
    await fs.rm(lock);
    assert.equal(await waiting, 1);

    const old = new Date(Date.now() - 60_000);
    await fs.writeFile(lock, "");
    await fs.utimes(lock, old, old);
    assert.equal(await store.add([at(T2)]), 1, "a stale lock is taken over");
    assert.equal(await exists(lock), false, "the lock is released afterwards");
  }));
