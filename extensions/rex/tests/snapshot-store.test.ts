import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate as settle } from "node:timers/promises";
import { createSnapshotStore, type SnapshotSource } from "../src/rex/snapshot-store";
import type { RexHost, RexSnapshot } from "../src/rex/types";

const local: RexHost = { label: "", thisMachine: true };
const mini: RexHost = { label: "mini", thisMachine: false };

function snapshot(hosts: RexHost[] = [local], fetchedAt = new Date().toISOString()): RexSnapshot {
  return { sessions: [], hosts, hostErrors: [], warnings: [], fetchedAt };
}

interface PendingRead {
  signal: AbortSignal;
  resolve: (snapshot: RexSnapshot) => void;
  reject: (error: Error) => void;
}

interface Stream {
  targets: string[][];
  onChange: () => void;
  stopped: boolean;
}

/** Reads settle only when a test says so; streams record their targets and whether they were stopped. */
function fakeSource(pollMs?: number) {
  const reads: PendingRead[] = [];
  const streams: Stream[] = [];
  const source: SnapshotSource = {
    pollMs,
    read: (signal) => new Promise((resolve, reject) => reads.push({ signal, resolve, reject })),
    targets: (hosts) => hosts.map((host) => [host.label || "local"]),
    follow(targets, onChange) {
      const stream: Stream = { targets, onChange, stopped: false };
      streams.push(stream);
      return () => {
        stream.stopped = true;
      };
    },
  };
  return { source, reads, streams, running: () => streams.filter((stream) => !stream.stopped) };
}

const ignore = () => undefined;

test("views pushed on top of each other share one read and one stream, which stop with the last view", () => {
  const fake = fakeSource();
  const store = createSnapshotStore(fake.source);
  const leaveRoot = store.subscribe(ignore);
  const leavePushed = store.subscribe(ignore);
  assert.equal(fake.reads.length, 1);
  assert.equal(fake.running().length, 1);

  leavePushed();
  assert.equal(fake.running().length, 1);
  assert.equal(fake.reads[0].signal.aborted, false);

  leaveRoot();
  assert.equal(fake.running().length, 0);
  assert.equal(fake.reads[0].signal.aborted, true);
});

test("changes during a read cause exactly one trailing read", async (t) => {
  const fake = fakeSource();
  const store = createSnapshotStore(fake.source);
  t.after(store.subscribe(ignore));

  store.refresh();
  fake.streams[0].onChange();
  store.refresh();
  assert.equal(fake.reads.length, 1);

  fake.reads[0].resolve(snapshot());
  await settle();
  assert.equal(fake.reads.length, 2);
  assert.equal(store.getState().isLoading, true);

  fake.reads[1].resolve(snapshot());
  await settle();
  assert.equal(fake.reads.length, 2);
  assert.equal(store.getState().isLoading, false);
});

test("a failed refresh keeps the last snapshot visible until a read succeeds", async (t) => {
  const fake = fakeSource();
  const cached = snapshot([local], "2026-01-01T00:00:00.000Z");
  const store = createSnapshotStore(fake.source, cached);
  t.after(store.subscribe(ignore));
  assert.equal(store.getState().snapshot, cached);

  fake.reads[0].reject(new Error("Rex server unreachable"));
  await settle();
  assert.equal(store.getState().snapshot, cached);
  assert.equal(store.getState().error?.message, "Rex server unreachable");
  assert.equal(store.getState().isLoading, false);

  store.refresh();
  const fresh = snapshot();
  fake.reads[1].resolve(fresh);
  await settle();
  assert.equal(store.getState().snapshot, fresh);
  assert.equal(store.getState().error, undefined);
});

test("a read from a closed lifecycle never publishes or schedules work in the next one", async (t) => {
  const fake = fakeSource();
  const store = createSnapshotStore(fake.source);
  const leave = store.subscribe(ignore);
  store.refresh(); // marks the first lifecycle as needing a trailing read
  const stale = fake.reads[0];
  leave();

  let notified = 0;
  t.after(store.subscribe(() => notified++));
  assert.equal(fake.reads.length, 2);

  stale.resolve(snapshot([local, mini]));
  await settle();
  assert.equal(notified, 0);
  assert.equal(store.getState().snapshot, undefined);
  assert.equal(store.getState().isLoading, true);
  assert.equal(fake.reads.length, 2, "no trailing read from the closed lifecycle");
  assert.equal(fake.streams.length, 2, "no stream restart from the closed lifecycle");

  const current = snapshot();
  fake.reads[1].resolve(current);
  await settle();
  assert.equal(store.getState().snapshot, current);
  assert.ok(notified > 0);
});

test("streams follow new hosts but are not restarted by every snapshot", async (t) => {
  const fake = fakeSource();
  const store = createSnapshotStore(fake.source, snapshot([local]));
  t.after(store.subscribe(ignore));
  const first = fake.running()[0];
  assert.deepEqual(first.targets, [["local"]]);

  fake.reads[0].resolve(snapshot([local]));
  await settle();
  assert.deepEqual(fake.running(), [first]);

  store.refresh();
  fake.reads[1].resolve(snapshot([local, mini]));
  await settle();
  assert.equal(first.stopped, true);
  assert.deepEqual(
    fake.running().map((stream) => stream.targets),
    [[["local"], ["mini"]]],
  );
  assert.equal(fake.streams.length, 2);
});

test("polling keeps retrying after a failure and stops with the last view", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const fake = fakeSource(1_000);
  const store = createSnapshotStore(fake.source);
  const leave = store.subscribe(ignore);

  fake.reads[0].reject(new Error("Rex server unreachable"));
  await settle();
  t.mock.timers.tick(1_000);
  assert.equal(fake.reads.length, 2);

  fake.reads[1].resolve(snapshot());
  await settle();
  assert.equal(store.getState().error, undefined);

  leave();
  t.mock.timers.tick(5_000);
  assert.equal(fake.reads.length, 2);
});

test("refreshes requested by multiple subscribers while publishing remain a single read", async (t) => {
  const fake = fakeSource();
  const store = createSnapshotStore(fake.source);
  for (let i = 0; i < 2; i++) {
    let requested = false;
    t.after(
      store.subscribe(() => {
        if (store.getState().snapshot && !requested) {
          requested = true;
          store.refresh();
        }
      }),
    );
  }
  fake.reads[0].resolve(snapshot());
  await settle();
  assert.equal(fake.reads.length, 2, "initial read and one shared follow-up");
});

test("an immediate subscription notification cannot start a duplicate initial read", (t) => {
  const fake = fakeSource();
  const follow = fake.source.follow;
  fake.source.follow = (targets, onChange) => {
    onChange();
    return follow(targets, onChange);
  };
  const store = createSnapshotStore(fake.source);
  t.after(store.subscribe(ignore));
  assert.equal(fake.reads.length, 1);
});
