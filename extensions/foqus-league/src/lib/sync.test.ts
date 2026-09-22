import type { OwnedCategory } from "./focusSetup.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CollectorStatus } from "./collector.ts";
import type { SessionStore, SyncState } from "./store.ts";
import { MAX_SESSION_MINUTES } from "./log.ts";
import { dedupe, syncIfStale, syncSessions, type StreamHarvest, type SyncSources } from "./sync.ts";
import type { FocusEvent, Session } from "./types.ts";

const MINUTE = 60_000;
const COLLECTOR_UP: CollectorStatus = { running: true, bytes: 1024 };

const EMPTY_STATE: SyncState = {
  version: 1,
  cursor: null,
  pending: [],
  streamOffset: 0,
  deleted: [],
  goalBlocks: {},
};

function fakeStore(initial: Partial<SyncState> = {}) {
  let state: SyncState = { ...EMPTY_STATE, ...initial };
  const added: Session[] = [];

  const impl: Partial<SessionStore> = {
    readState: async () => state,
    writeState: async (next) => {
      state = next;
    },
    mutateState: async (fn) => {
      state = fn(state);
      return state;
    },
    add: async (sessions) => {
      added.push(...sessions);
      return sessions.length;
    },
  };

  return {
    store: impl as SessionStore,
    added,
    state: () => state,
    poke: (change: Partial<SyncState>) => {
      state = { ...state, ...change };
    },
  };
}

function barrier() {
  let open = () => {};
  const held = new Promise<void>((resolve) => (open = resolve));
  return { held, release: () => open() };
}

function fakeSources(
  stream: FocusEvent[],
  archive: FocusEvent[] | Error,
  nextOffset = 512,
  opts: {
    reset?: boolean;
    continuous?: boolean;
    beforeArchive?: () => void;
    until?: Promise<void>;
    categories?: OwnedCategory[];
    streamBytes?: number;
  } = {},
): SyncSources {
  return {
    categories: async () => opts.categories ?? [],
    streamBytes: async () => opts.streamBytes ?? 0,
    stream: async (offset): Promise<StreamHarvest> => ({
      events: stream,
      records: stream.length,
      offset: stream.length ? nextOffset : offset,
      reset: opts.reset ?? false,
      continuous: opts.continuous ?? false,
      collector: COLLECTOR_UP,
    }),
    archive: async () => {
      opts.beforeArchive?.();
      if (opts.until) await opts.until;
      if (archive instanceof Error) throw archive;
      return { events: archive, records: archive.length };
    },
  };
}

const startEvent = (at: number, goal: string, plannedSeconds: number | null = null): FocusEvent => ({
  type: "start",
  at,
  goal,
  plannedSeconds,
});

const summaryEvent = (at: number, startedAt: number, reportedSeconds: number | null = null): FocusEvent => ({
  type: "summary",
  at,
  startedAt,
  reportedSeconds,
  pauses: 0,
  blocks: 0,
});

test("dedupe keeps the first of two events of the same type at the same instant", () => {
  const at = Date.UTC(2026, 8, 16, 10, 0, 0);
  const events = [startEvent(at, "from the stream"), startEvent(at, "from the archive")];

  const [first, ...rest] = dedupe(events);
  assert.deepEqual(rest, []);
  assert.equal(first.type === "start" && first.goal, "from the stream");
});

test("dedupe keeps a start and a summary that share an instant", () => {
  const at = Date.UTC(2026, 8, 16, 10, 0, 0);
  assert.equal(dedupe([startEvent(at, "Ship"), summaryEvent(at, at)]).length, 2);
});

test("dedupe preserves order", () => {
  const at = Date.UTC(2026, 8, 16, 10, 0, 0);
  const events = [startEvent(at, "a"), startEvent(at + 1, "b"), startEvent(at, "a again")];
  assert.deepEqual(
    dedupe(events).map((e) => e.at),
    [at, at + 1],
  );
});

test("syncSessions stores the sessions both sources add up to, counting each event once", async () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const summary = summaryEvent(start + 25 * MINUTE, start, 25 * 60);
  const fake = fakeStore();

  const result = await syncSessions(fake.store, fakeSources([startEvent(start, "Deep work"), summary], [summary]));

  assert.equal(result.added, 1);
  assert.deepEqual(fake.added, [{ start, goal: "Deep work", duration: 25, source: "reported" }]);
  assert.deepEqual(result.collector, COLLECTOR_UP);
});

test("syncSessions advances the cursor and the stream offset", async () => {
  const fake = fakeStore({ cursor: 1, streamOffset: 100 });
  const before = Date.now();

  await syncSessions(fake.store, fakeSources([startEvent(Date.now() - MINUTE, "Ship")], [], 4096));

  const state = fake.state();
  assert.equal(state.streamOffset, 4096);
  assert.ok(state.cursor !== null && state.cursor >= before, "cursor moves to the moment the sync began");
});

test("syncSessions carries an unfinished session forward in pending", async () => {
  const running = Date.now() - 5 * MINUTE;
  const fake = fakeStore();

  await syncSessions(fake.store, fakeSources([startEvent(running, "Writing")], []));

  assert.deepEqual(fake.state().pending, [{ at: running, goal: "Writing" }]);
  assert.deepEqual(fake.added, []);
});

test("syncSessions finishes a session whose start was carried forward", async () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const fake = fakeStore({ pending: [{ at: start, goal: "Writing" }] });

  await syncSessions(fake.store, fakeSources([], [summaryEvent(start + 40 * MINUTE, start, 40 * 60)]));

  assert.deepEqual(fake.added, [{ start, goal: "Writing", duration: 40, source: "reported" }]);
  assert.deepEqual(fake.state().pending, []);
});

test("syncSessions survives a failed archive read when the collector had events", async () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const fake = fakeStore();

  const result = await syncSessions(
    fake.store,
    fakeSources(
      [startEvent(start, "Deep work"), summaryEvent(start + 25 * MINUTE, start, 25 * 60)],
      new Error("Could not read the log"),
    ),
  );

  assert.equal(result.added, 1);
});

test("syncSessions reports a failed archive read when there is nothing else to show", async () => {
  const fake = fakeStore();
  await assert.rejects(
    () => syncSessions(fake.store, fakeSources([], new Error("Could not read the log"))),
    /Could not read the log/,
  );
});

test("syncIfStale does nothing while the last read is recent", async () => {
  const cursor = Date.now() - 30_000;
  const fake = fakeStore({ cursor });

  assert.equal(await syncIfStale(fake.store, fakeSources([], [])), null);
  assert.equal(fake.state().cursor, cursor, "a skipped sync leaves the cursor where it was");
});

test("syncIfStale reads again once the cursor is old enough", async () => {
  const fake = fakeStore({ cursor: Date.now() - 10 * MINUTE });
  const result = await syncIfStale(fake.store, fakeSources([], []));
  assert.notEqual(result, null);
});

test("syncIfStale reads on a first run, when there is no cursor at all", async () => {
  const fake = fakeStore();
  assert.notEqual(await syncIfStale(fake.store, fakeSources([], [])), null);
});

test("a tombstone written while the archive read was blocked survives the sync", async () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const fake = fakeStore();

  await syncSessions(
    fake.store,
    fakeSources([startEvent(start, "Deep work")], [], 512, { beforeArchive: () => fake.poke({ deleted: [start] }) }),
  );

  assert.deepEqual(fake.state().deleted, [start], "a sync must not roll back a deletion it never knew about");
});

test("goal blocks learned while the archive read was blocked survive the sync", async () => {
  const fake = fakeStore();
  const learned = { Break: { categories: [{ id: "social", title: "Social" }], mode: "block" as const, skipped: [] } };

  await syncSessions(fake.store, fakeSources([], [], 512, { beforeArchive: () => fake.poke({ goalBlocks: learned }) }));

  assert.deepEqual(fake.state().goalBlocks, learned, "the menu bar learns these on the same tick as the sync");
});

test("a sync that finishes late cannot rewind the resume markers a faster one set", async () => {
  const fake = fakeStore({ cursor: 1000, streamOffset: 100 });
  const running = [startEvent(Date.now() - MINUTE, "Ship")];

  const gate = barrier();
  const slow = syncSessions(fake.store, fakeSources(running, [], 500, { until: gate.held }));
  await syncSessions(fake.store, fakeSources(running, [], 900));

  const afterFast = { ...fake.state() };
  gate.release();
  await slow;
  const afterSlow = fake.state();

  assert.equal(afterFast.streamOffset, 900);
  assert.equal(afterSlow.streamOffset, 900, "the slow sync must not re-consume bytes the fast one already read");
  assert.ok(
    afterSlow.cursor !== null && afterFast.cursor !== null && afterSlow.cursor >= afterFast.cursor,
    "nor re-open an archive window the fast one already covered",
  );
});

test("a rotation is still allowed to move the stream offset back to zero", async () => {
  const fake = fakeStore({ streamOffset: 8_000_000 });

  await syncSessions(fake.store, fakeSources([startEvent(Date.now() - MINUTE, "Ship")], [], 0, { reset: true }));

  assert.equal(fake.state().streamOffset, 0, "the monotonic guard must not pin the offset past the new file's end");
});

test("a failed archive read the stream covered for is reported as a warning, not swallowed", async () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const fake = fakeStore();

  const result = await syncSessions(
    fake.store,
    fakeSources(
      [startEvent(start, "Deep work"), summaryEvent(start + 25 * MINUTE, start, 25 * 60)],
      new Error("Could not read the log: log: command not found"),
    ),
  );

  assert.equal(result.added, 1);
  assert.match(result.warning ?? "", /Could not read the log/);
});

test("a start learned while the archive read was blocked survives the sync", async () => {
  const running = Date.now() - MINUTE;
  const fake = fakeStore({ cursor: 1000, streamOffset: 100 });

  await syncSessions(
    fake.store,
    fakeSources([], [], 100, {
      beforeArchive: () => fake.poke({ pending: [{ at: running, goal: "Deep work" }], streamOffset: 900 }),
    }),
  );

  const state = fake.state();
  assert.deepEqual(state.pending, [{ at: running, goal: "Deep work" }], "the goal must not be erased");
  assert.equal(state.streamOffset, 900, "and the offset stays past the bytes that carried it");
});

test("a sync that finishes late keeps the starts a faster one carried forward", async () => {
  const s1 = Date.now() - 2 * MINUTE;
  const s2 = Date.now() - MINUTE;
  const fake = fakeStore({ cursor: 1000, streamOffset: 100 });

  const gate = barrier();
  const slow = syncSessions(fake.store, fakeSources([startEvent(s1, "Ship")], [], 500, { until: gate.held }));
  await syncSessions(fake.store, fakeSources([startEvent(s1, "Ship"), startEvent(s2, "Write the report")], [], 900));
  gate.release();
  await slow;

  assert.deepEqual(
    fake.state().pending,
    [
      { at: s1, goal: "Ship" },
      { at: s2, goal: "Write the report" },
    ],
    "S2 would otherwise be recorded later with an empty goal, permanently",
  );
});

test("a start this sync paired off is dropped from pending, not carried round again", async () => {
  const start = Date.now() - 30 * MINUTE;
  const fake = fakeStore({ pending: [{ at: start, goal: "Writing" }] });

  await syncSessions(fake.store, fakeSources([], [summaryEvent(start + 25 * MINUTE, start, 25 * 60)]));

  assert.deepEqual(fake.added, [{ start, goal: "Writing", duration: 25, source: "reported" }]);
  assert.deepEqual(fake.state().pending, [], "merging must not resurrect a start that is finished");
});

test("a cursor left in the future is re-anchored to now rather than pinned there", async () => {
  const tomorrow = Date.now() + 86_400_000;
  const fake = fakeStore({ cursor: tomorrow });
  const before = Date.now();

  await syncSessions(fake.store, fakeSources([], []));

  const cursor = fake.state().cursor;
  assert.ok(cursor !== null && cursor <= Date.now(), "a cursor ahead of the clock is not a cursor");
  assert.ok(cursor !== null && cursor >= before);
});

test("syncIfStale treats a cursor in the future as stale, not as permanently fresh", async () => {
  const fake = fakeStore({ cursor: Date.now() + 86_400_000 });

  const result = await syncIfStale(fake.store, fakeSources([], []));

  assert.notEqual(result, null, "skipping every sync for a day is how recording stops altogether");
  assert.ok((fake.state().cursor ?? 0) <= Date.now(), "and the sync repairs the cursor on its way through");
});

test("a sync reports what the log held and what this parser made of it", async () => {
  const start = Date.now() - 30 * MINUTE;
  const fake = fakeStore();

  const result = await syncSessions(
    fake.store,
    fakeSources([startEvent(start, "Ship")], [summaryEvent(start + 25 * MINUTE, start, 25 * 60)]),
  );

  assert.equal(result.records, 2, "both sources' messages are counted");
  assert.equal(result.parsed, 2);
});

test("a log this parser cannot read is a sync with records and nothing parsed", async () => {
  const fake = fakeStore();
  const sources = fakeSources([], []);
  const blind: SyncSources = { ...sources, archive: async () => ({ events: [], records: 40 }) };

  const result = await syncSessions(fake.store, blind);

  assert.equal(result.added, 0);
  assert.equal(result.warning, undefined, "nothing failed, which is exactly the problem");
  assert.equal(result.records, 40);
  assert.equal(result.parsed, 0);
});

test("a sync the collector never stopped covering skips the system log scan altogether", async () => {
  const start = Date.now() - 30 * MINUTE;
  const fake = fakeStore({ cursor: Date.now() - 10 * MINUTE, streamOffset: 100 });
  let scanned = false;

  const result = await syncSessions(
    fake.store,
    fakeSources([startEvent(start, "Ship"), summaryEvent(start + 25 * MINUTE, start, 25 * 60)], [], 512, {
      continuous: true,
      beforeArchive: () => (scanned = true),
    }),
  );

  assert.equal(scanned, false, "the stream already holds every event the scan would find, and the scan costs seconds");
  assert.equal(result.added, 1);
});

test("a first sync still scans the system log, however healthy the collector looks", async () => {
  const fake = fakeStore({ streamOffset: 100 });
  let scanned = false;

  await syncSessions(fake.store, fakeSources([], [], 512, { continuous: true, beforeArchive: () => (scanned = true) }));

  assert.equal(scanned, true, "without a cursor there is no stretch of time the stream is known to cover");
});

test("syncIfStale reads at once when the collector has written bytes nobody has read", async () => {
  const fake = fakeStore({ cursor: Date.now(), streamOffset: 100 });
  const result = await syncIfStale(fake.store, fakeSources([], [], 512, { streamBytes: 4096 }));
  assert.notEqual(result, null, "a session that just ended does not wait for the staleness window");
});

test("syncIfStale still holds off when the stream has nothing new in it", async () => {
  const fake = fakeStore({ cursor: Date.now(), streamOffset: 4096 });
  const result = await syncIfStale(fake.store, fakeSources([], [], 512, { streamBytes: 4096 }));
  assert.equal(result, null, "a quiet minute is still a quiet minute");
});

test("syncIfStale reads anyway when the stream size cannot be told", async () => {
  const fake = fakeStore({ cursor: Date.now() - 200_000, streamOffset: 0 });
  const sources = { ...fakeSources([], [], 512), streamBytes: () => Promise.reject(new Error("gone")) };
  const result = await syncIfStale(fake.store, sources);
  assert.notEqual(result, null, "a stat that fails must not stop a stale sync");
});

test("a start older than the longest possible session is not carried forward", async () => {
  const stale = Date.now() - (MAX_SESSION_MINUTES + 60) * MINUTE;
  const fake = fakeStore({ pending: [{ at: stale, goal: "Abandoned" }] });

  await syncSessions(fake.store, fakeSources([startEvent(stale - MINUTE, "Also abandoned")], []));

  assert.deepEqual(fake.state().pending, [], "nothing can finish a start that old");
});

test("the carried-forward starts are capped at fifty, keeping the newest", async () => {
  const now = Date.now();
  const fake = fakeStore();
  const events = Array.from({ length: 60 }, (_, i) => startEvent(now - (60 - i) * 1000, `goal ${i}`));

  await syncSessions(fake.store, fakeSources(events, []));

  const pending = fake.state().pending;
  assert.equal(pending.length, 50);
  assert.equal(pending[0].goal, "goal 10");
  assert.equal(pending[49].goal, "goal 59");
});
