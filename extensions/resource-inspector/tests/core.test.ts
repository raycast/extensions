import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import {
  entities,
  interval,
  parseBytes,
  ProcessRow,
  Snapshot,
} from "../src/model";
import { HistoryStore } from "../src/storage";
import { parseDiagnostic } from "../src/diagnostic-data";
import { validateContainer } from "../src/containers";
import { nativeCall } from "../src/native";
const binary = resolve("assets/inspector");
function proc(overrides: Partial<ProcessRow> = {}): ProcessRow {
  return {
    pid: 40,
    ppid: 1,
    uid: 501,
    start: "100:1",
    name: "App",
    executable: "/Applications/Example.app/Contents/MacOS/App",
    memory: 1024,
    cpuNs: 1e9,
    readBytes: 100,
    writeBytes: 200,
    appPath: "/Applications/Example.app",
    appName: "Example",
    appPid: 40,
    bundleId: "example.app",
    blockedReason: null,
    ...overrides,
  };
}
function snap(time = 1000, processes = [proc()]): Snapshot {
  return {
    timestamp: time,
    awake: time,
    boot: "test-boot",
    processes,
    containers: [],
    system: {
      totalMemory: 32000,
      compressed: 0,
      pressure: 1,
      logicalCPUs: 10,
      swapUsed: 0,
    },
  };
}
test("physical memory groups helpers once; CPU uses elapsed counter deltas", () => {
  const old = snap(1000, [proc(), proc({ pid: 41, memory: 2048 })]);
  const now = snap(1060, [
    proc({ cpuNs: 31e9, writeBytes: 300 }),
    proc({ pid: 41, memory: 2048, cpuNs: 31e9 }),
  ]);
  const result = entities(now, old),
    app = result.find((e) => e.kind === "app")!;
  assert.equal(app.memory, 3072);
  assert.equal(app.cpuPercent, 100);
  assert.equal(app.cpuSeconds, 60);
  assert.equal(app.writeDelta, 100);
  assert.equal(result.filter((e) => e.kind === "process").length, 2);
});
test("PID reuse, reboot, sleep and long gaps never produce fictional usage", () => {
  const old = snap();
  assert.equal(
    entities(snap(1060, [proc({ start: "200:1", cpuNs: 100e9 })]), old).find(
      (e) => e.kind === "process",
    )!.cpuSeconds,
    null,
  );
  assert.equal(interval({ ...snap(1060), boot: "other" }, old), 0);
  assert.equal(interval({ ...snap(1060), awake: 1002 }, old), 0);
  assert.equal(interval(snap(2000), old), 0);
});
test("multiple app instances never select an arbitrary quit target, while processes remain selectable", () => {
  for (const processes of [
    [proc(), proc({ pid: 50, appPid: 50, start: "200:0" })],
    [
      proc({
        appPid: undefined,
        appBlockedReason: "Multiple running instances (2)",
      }),
      proc({
        pid: 50,
        appPid: undefined,
        appBlockedReason: "Multiple running instances (2)",
      }),
    ],
  ]) {
    const rows = entities(snap(1060, processes), snap());
    const app = rows.find((e) => e.kind === "app")!;
    assert.equal(app.memory, 2048);
    assert.equal(app.target, undefined);
    assert.match(app.blockedReason!, /Multiple running instances/);
    assert.ok(
      rows
        .filter((e) => e.kind === "process")
        .every((e) => e.target && !e.blockedReason),
    );
  }
  const single = entities(snap()).find((e) => e.kind === "app")!;
  assert.equal(single.target?.pid, 40);
  assert.equal(single.blockedReason, undefined);
});
test("a new or unreadable helper does not hide measured CPU for the whole app", () => {
  const old = snap(1000);
  const now = snap(1060, [
    proc({ cpuNs: 31e9 }),
    proc({ pid: 42, start: "1040:0", cpuNs: 10e9 }),
    proc({ pid: 43, cpuNs: null }),
  ]);
  const app = entities(now, old).find((e) => e.kind === "app")!;
  assert.equal(app.cpuSeconds, 40);
  assert.equal(app.partialMetrics, true);
  assert.ok(app.cpuPercent! > 66 && app.cpuPercent! < 67);
});
test("unavailable counters stay unavailable and container memory remains separate", () => {
  const now = snap(1060, [proc({ memory: null })]);
  now.containers = [
    {
      id: "a".repeat(64),
      name: "db",
      startedAt: "today",
      status: "running",
      stopSignal: "SIGTERM",
      memory: 300,
      cpuPercent: 2,
      readBytes: 0,
      writeBytes: 0,
    },
  ];
  const result = entities(now, snap());
  assert.equal(result.find((e) => e.kind === "app")!.memory, null);
  assert.equal(result.find((e) => e.kind === "container")!.memory, 300);
  assert.equal(parseBytes("1.5GiB"), 1.5 * 1024 ** 3);
  assert.equal(parseBytes("2MB"), 2000000);
  assert.equal(parseBytes("unknown"), null);
  assert.throws(
    () =>
      validateContainer(now.containers[0], {
        ...now.containers[0],
        startedAt: "new",
      }),
    /restarted/,
  );
});
test("diagnostics use report timestamps and preserve event limitations", () => {
  const report = parseDiagnostic(
    "Date/Time: 2026-09-16 08:00:00.000 +0200\nCommand: node\nEvent: disk writes\nWrites: 10 GB\nFootprint: 1 MB\nFootprint: 2 MB",
    "/tmp/node.diag",
  )!;
  assert.equal(report.timestamp, Date.parse("2026-09-16T06:00:00Z"));
  assert.match(report.summary, /10 GB/);
  assert.doesNotMatch(report.summary, /2 MB/);
  const jetsam = parseDiagnostic(
    "{}\n" +
      JSON.stringify({
        date: "2026-09-16 08:00:00.000 +0200",
        memoryStatus: { pageSize: 16384 },
        processes: [
          {
            name: "test",
            pid: 1,
            coalition: 3,
            rpages: 65536,
            reason: "per-process-limit",
          },
        ],
      }),
    "/tmp/JetsamEvent.ips",
  )!;
  assert.match(jetsam.summary, /1.00 GiB/);
  assert.match(jetsam.summary, /does not establish a system-wide/);
});
test("SQLite recording, compaction, seven-day pruning, pause, clear and rollback", async () => {
  const dir = await mkdtemp(join(tmpdir(), "resource-inspector-test-"));
  const store = new HistoryStore(binary, join(dir, "history.sqlite"));
  try {
    await store.record(snap(1e6));
    await store.record(
      snap(1e6 + 60, [proc({ memory: 2048, cpuNs: 31e9, writeBytes: 1200 })]),
    );
    const [row] = await store.history(0, "app");
    assert.equal(row.peak, 2048);
    assert.equal(row.average, 2048);
    assert.equal(row.cpu, 30);
    assert.equal(row.observed, 60);
    await store.record(snap(1e6 + 60));
    assert.equal((await store.coverage(0)).count, 2);
    await store.record(snap(1e6 + 90000));
    const [hours] = await store.run([
      { sql: "SELECT COUNT(*) AS count FROM hours" },
    ]);
    assert.ok(Number(hours[0].count) > 0);
    assert.equal((await store.history(0, "app"))[0].cpu, 30);
    await assert.rejects(
      store.run([
        { sql: "INSERT INTO meta VALUES ('rollback','yes')" },
        { sql: "INVALID SQL" },
      ]),
    );
    assert.equal(await store.meta("rollback"), undefined);
    await store.setMeta("paused", "true");
    await store.record(snap(1e6 + 90100));
    assert.equal((await store.coverage(0)).count, 3);
    await store.setMeta("paused", "false");
    await store.record(snap(1e6 + 9 * 86400));
    assert.equal((await store.coverage(0)).count, 1);
    await store.clear();
    assert.equal((await store.history(0, "app")).length, 0);
    assert.equal(await store.meta("paused"), "true");
    await store.record(snap(3e6));
    assert.equal((await store.coverage(0)).count, 0);
    const corrupt = new HistoryStore(binary, join(dir, "corrupt.sqlite"));
    await writeFile(corrupt.path, "not a database");
    await assert.rejects(corrupt.history(0, "app"), /database/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("zero-duration baselines retain memory without making complete history partial", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "inspector-baseline-history-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new HistoryStore(binary, join(dir, "history.sqlite"));
  const start = 100 * 3600;
  await store.record(snap(start));
  let row = (await store.history(start, "app"))[0];
  assert.equal(row.observed, 0);
  assert.equal(row.peak, 1024);
  assert.equal(row.cpu, null);
  assert.equal(row.partialMetrics, 0);
  await store.record(
    snap(start + 60, [proc({ cpuNs: 31e9, writeBytes: 1200 })]),
  );
  // Simulate a baseline written by the earlier version. Ignore its flag in both
  // raw history and compaction, while retaining real partial measured intervals.
  await store.run([{ sql: "UPDATE samples SET partial=1 WHERE observed=0" }]);
  row = (await store.history(start, "app"))[0];
  assert.equal(row.cpu, 30);
  assert.equal(row.partialMetrics, 0);
  await store.record(snap(start + 90000));
  assert.equal((await store.history(start, "app"))[0].partialMetrics, 0);
  const [hours] = await store.run([
    { sql: "SELECT partial FROM hours WHERE kind='app'" },
  ]);
  assert.equal(hours[0].partial, 0);
  // An old baseline-only hour must not taint a later complete hourly upsert.
  await store.run([
    {
      sql: "UPDATE hours SET observed=0,cpu=NULL,reads=NULL,writes=NULL,partial=1",
    },
  ]);
  assert.equal((await store.history(start, "app"))[0].partialMetrics, 0);
  const { recordingStatements } = await import("../src/storage");
  await store.run(
    recordingStatements(
      snap(start + 120, [proc({ cpuNs: 61e9 })]),
      snap(start + 60, [proc({ cpuNs: 31e9 })]),
    ),
  );
  await store.run(recordingStatements(snap(start + 90100)));
  row = (await store.history(start, "app"))[0];
  assert.equal(row.cpu, 30);
  assert.equal(row.partialMetrics, 0);
});

test("partial totals survive storage, mixed hourly compaction, and subsequent aggregation", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "inspector-partial-history-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new HistoryStore(binary, join(dir, "history.sqlite"));
  const start = 100 * 3600;
  await store.record(snap(start));
  await store.record(
    snap(start + 60, [proc({ cpuNs: 31e9, writeBytes: 1200 })]),
  );
  assert.equal((await store.history(start + 60, "app"))[0].partialMetrics, 0);
  await store.record(
    snap(start + 120, [
      proc({ cpuNs: 61e9, writeBytes: 2200 }),
      proc({ pid: 43, cpuNs: null, readBytes: null, writeBytes: null }),
    ]),
  );
  const before = (await store.history(start + 60, "app"))[0];
  assert.equal(before.cpu, 60);
  assert.equal(before.writes, 2000);
  assert.equal(before.partialMetrics, 1);
  await store.record(snap(start + 90000));
  const after = (await store.history(start, "app"))[0];
  assert.equal(after.cpu, 60);
  assert.equal(after.writes, 2000);
  assert.equal(after.partialMetrics, 1);
  const [hour] = await store.run([
    { sql: "SELECT partial FROM hours WHERE kind='app'" },
  ]);
  assert.equal(hour[0].partial, 1);
  // A late sample can update an existing hourly bucket; it must not clear the warning.
  const { recordingStatements } = await import("../src/storage");
  await store.run(
    recordingStatements(
      snap(start + 180, [proc({ cpuNs: 91e9 })]),
      snap(start + 120, [proc({ cpuNs: 61e9 })]),
    ),
  );
  await store.run(recordingStatements(snap(start + 90100)));
  assert.equal((await store.history(start, "app"))[0].partialMetrics, 1);
});

test("legacy history migrates atomically and keeps old totals with unknown completeness", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "inspector-history-migration-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "history.sqlite");
  await nativeCall(binary, "database", {
    path,
    statements: [
      {
        sql: "CREATE TABLE samples (time REAL,key TEXT,kind TEXT,name TEXT,memory REAL,weight REAL,integral REAL,cpu REAL,reads REAL,writes REAL,observed REAL,PRIMARY KEY(time,key))",
      },
      {
        sql: "CREATE TABLE hours (time REAL,key TEXT,kind TEXT,name TEXT,peak REAL,weight REAL,integral REAL,cpu REAL,reads REAL,writes REAL,observed REAL,count INTEGER,PRIMARY KEY(time,key))",
      },
      {
        sql: "INSERT INTO samples VALUES (1000,'app:legacy','app','Legacy',2048,60,122880,30,100,200,60)",
      },
      {
        sql: "INSERT INTO hours VALUES (0,'app:legacy','app','Legacy',1024,60,61440,15,50,100,60,1)",
      },
    ],
  });
  const stores = [
    new HistoryStore(binary, path),
    new HistoryStore(binary, path),
  ];
  const histories = await Promise.all(
    stores.map((store) => store.history(0, "app")),
  );
  for (const [row] of histories) {
    assert.equal(row.cpu, 45);
    assert.equal(row.writes, 300);
    assert.equal(row.count, 2);
    assert.equal(row.partialMetrics, 1);
  }
  const [columns] = await stores[0].run([
    {
      sql: "SELECT name FROM pragma_table_info('samples') WHERE name='partial'",
    },
  ]);
  assert.equal(columns.length, 1);
});
