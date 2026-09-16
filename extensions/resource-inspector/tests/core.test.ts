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
