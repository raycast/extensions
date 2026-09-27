import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { entities, ProcessRow, Snapshot } from "../src/model";
import { resourceClass, trackedSnapshot, historyClass } from "../src/tracking";
import { HistoryStore } from "../src/storage";
import { parseDiagnostic } from "../src/diagnostic-data";

function processRow(
  pid: number,
  executable: string,
  extra: Partial<ProcessRow> = {},
): ProcessRow {
  return {
    pid,
    ppid: 1,
    uid: 501,
    start: "100:1",
    executable,
    name: executable.split("/").pop()!,
    memory: 1024,
    cpuNs: 1e9,
    readBytes: 100,
    writeBytes: 200,
    blockedReason: null,
    ...extra,
  };
}
const work = processRow(
  40,
  "/Applications/Example.app/Contents/MacOS/Example",
  {
    appPath: "/Applications/Example.app",
    appPid: 40,
    appName: "Example",
    bundleId: "com.example.app",
  },
);
const system = processRow(41, "/System/Library/CoreServices/WindowServer", {
  name: "WindowServer",
});
const apple = processRow(
  42,
  "/System/Applications/Notes.app/Contents/MacOS/Notes",
  {
    appPath: "/System/Applications/Notes.app",
    appPid: 42,
    bundleId: "com.apple.Notes",
    appName: "Notes",
  },
);
const tool = processRow(43, "/usr/bin/git");
const unknown = processRow(44, "", { name: "node" });
function snapshot(timestamp = 360000): Snapshot {
  return {
    timestamp,
    awake: timestamp,
    boot: "test-boot",
    processes: [work, system, apple, tool, unknown].map((p) => ({
      ...p,
      cpuNs: 1e9 + (timestamp - 360000) * 1e9,
    })),
    containers: [
      {
        id: "a".repeat(64),
        name: "fixture",
        startedAt: "start",
        status: "running",
        stopSignal: "SIGTERM",
        memory: 100,
        cpuPercent: 0,
        readBytes: 0,
        writeBytes: 0,
      },
    ],
    system: {
      totalMemory: 32000,
      logicalCPUs: 10,
      pressure: 1,
      compressed: 1000,
      swapUsed: 500,
    },
  };
}

test("system identity filtering preserves third-party apps and development tools", () => {
  for (const executable of [
    "/System/Library/CoreServices/mds",
    "/usr/libexec/launchd",
    "/usr/sbin/syslogd",
    "/usr/lib/dyld",
    "/sbin/launchd",
    "/Library/Apple/System/Library/oahd",
  ])
    assert.equal(resourceClass({ executable }), "system");
  for (const executable of [
    "/opt/homebrew/bin/node",
    "/usr/bin/python3",
    "/usr/bin/git",
    "/bin/zsh",
    "/Library/PrivilegedHelperTools/com.orbstack.helper",
    "/Users/test/code/my-app",
  ])
    assert.equal(resourceClass({ executable }), "user");
  assert.equal(resourceClass(work), "user");
  assert.equal(resourceClass(apple), "apple-app");
  assert.equal(
    resourceClass({
      executable:
        "/System/Cryptexes/App/System/Applications/Safari.app/Contents/MacOS/Safari",
    }),
    "apple-app",
  );
  assert.equal(
    resourceClass({
      executable: "/Applications/Xcode.app/Contents/MacOS/Xcode",
      bundleId: "com.apple.dt.Xcode",
    }),
    "user",
  );
  assert.equal(resourceClass(unknown), "unknown");
  // Neither a familiar process name nor privileged ownership proves Apple origin.
  assert.equal(
    resourceClass(processRow(45, "/opt/homebrew/bin/mds", { uid: 0 })),
    "user",
  );
});

test("all views use filtered processes while containers and whole-Mac metrics remain intact", () => {
  const raw = snapshot();
  const apps = trackedSnapshot(raw, "apps");
  assert.deepEqual(
    apps.processes.map((p) => p.pid),
    [40, 42, 43],
  );
  assert.deepEqual(
    trackedSnapshot(raw, "third-party").processes.map((p) => p.pid),
    [40, 43],
  );
  assert.deepEqual(trackedSnapshot(raw, "all"), raw);
  assert.equal(apps.containers, raw.containers);
  assert.equal(apps.system, raw.system);
  const rows = entities(trackedSnapshot(snapshot(360060), "apps"), apps);
  assert.equal(
    rows.some((r) => r.name === "WindowServer"),
    false,
  );
  assert.equal(
    rows.find((r) => r.kind === "app" && r.name === "Example")?.cpuSeconds,
    60,
  );
  assert.equal(rows.find((r) => r.kind === "container")?.memory, 100);
  assert.equal(raw.processes.length, 5);
});

test("excluded resources are absent from new samples and the stored baseline", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "inspector-tracking-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new HistoryStore(
    resolve("assets/inspector"),
    join(dir, "history.sqlite"),
  );
  await store.record(trackedSnapshot(snapshot(), "apps"));
  await store.record(trackedSnapshot(snapshot(360060), "apps"));
  const baseline = JSON.parse((await store.meta("previous"))!) as Snapshot;
  assert.deepEqual(
    baseline.processes.map((p) => p.pid),
    [40, 42, 43],
  );
  const [rows] = await store.run([
    { sql: "SELECT DISTINCT category FROM samples" },
  ]);
  assert.deepEqual(
    new Set(rows.map((r) => r.category)),
    new Set(["user", "apple-app"]),
  );
  assert.equal(
    (await store.history(0, "process", "all")).some(
      (r) => r.name === "WindowServer",
    ),
    false,
  );
});

test("scope filtering covers existing raw and hourly history without deleting measurements", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "inspector-tracking-history-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new HistoryStore(
    resolve("assets/inspector"),
    join(dir, "history.sqlite"),
  );
  await store.record(snapshot());
  await store.record(snapshot(360060));
  const all = await store.history(0, "process", "all");
  assert.equal(all.length, 5);
  assert.deepEqual(
    (await store.history(0, "process", "apps")).map((r) => r.name).sort(),
    ["Example", "Notes", "git"],
  );
  assert.deepEqual(
    (await store.history(0, "process", "third-party"))
      .map((r) => r.name)
      .sort(),
    ["Example", "git"],
  );
  await store.record(trackedSnapshot(snapshot(450000), "apps"));
  const [hours] = await store.run([
    { sql: "SELECT COUNT(*) AS count FROM hours" },
  ]);
  assert.ok(Number(hours[0].count) > 0);
  assert.deepEqual(
    (await store.history(0, "process", "third-party"))
      .map((r) => r.name)
      .sort(),
    ["Example", "git"],
  );
  assert.equal(
    (await store.history(0, "process", "all")).find(
      (r) => r.name === "WindowServer",
    )?.cpu,
    60,
  );
});

test("legacy identities are not guessed from names and become visible when classified", async (t) => {
  assert.equal(
    historyClass({
      key: "process:boot:41:100:1",
      kind: "process",
      category: "unknown",
    }),
    "unknown",
  );
  assert.equal(
    historyClass({
      key: "app:/System/Library/CoreServices/Finder.app",
      kind: "app",
    }),
    "system",
  );
  assert.equal(
    historyClass({ key: "app:/Applications/Example.app", kind: "app" }),
    "unknown",
  );
  const dir = await mkdtemp(join(tmpdir(), "inspector-tracking-legacy-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new HistoryStore(
    resolve("assets/inspector"),
    join(dir, "history.sqlite"),
  );
  await store.record(snapshot());
  await store.run([{ sql: "UPDATE samples SET category='unknown'" }]);
  assert.equal((await store.history(0, "process", "apps")).length, 0);
  assert.equal((await store.history(0, "process", "all")).length, 5);
  await store.record(trackedSnapshot(snapshot(360060), "apps"));
  const row = (await store.history(0, "process", "apps")).find(
    (r) => r.name === "Example",
  )!;
  assert.equal(row.count, 2);
  assert.equal(row.cpu, 60);
});

test("diagnostics use executable identity and hide mixed or unidentifiable reports", () => {
  const report = (executable: string) =>
    `Date/Time: 2026-09-17 08:00:00.000 +0200\nCommand: example\nPath: ${executable}\nEvent: disk writes\nWrites: 10 GB`;
  assert.equal(
    parseDiagnostic(report(system.executable), "/tmp/system.diag", "apps"),
    null,
  );
  assert.ok(parseDiagnostic(report(work.executable), "/tmp/work.diag", "apps"));
  assert.ok(
    parseDiagnostic(report(apple.executable), "/tmp/apple.diag", "apps"),
  );
  assert.equal(
    parseDiagnostic(report(apple.executable), "/tmp/apple.diag", "third-party"),
    null,
  );
  assert.equal(parseDiagnostic(report(""), "/tmp/unknown.diag", "apps"), null);
  assert.ok(parseDiagnostic(report(""), "/tmp/unknown.diag", "all"));
  assert.equal(parseDiagnostic("{}\n{}", "/tmp/JetsamEvent.ips", "apps"), null);
});

test("known system intervals stay excluded if a process changes executable within an hour", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "inspector-tracking-exec-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new HistoryStore(
    resolve("assets/inspector"),
    join(dir, "history.sqlite"),
  );
  const sample = (time: number, executable: string) => ({
    ...snapshot(time),
    processes: [processRow(80, executable, { cpuNs: (time - 360000) * 1e9 })],
  });
  await store.record(sample(360000, "/usr/bin/git"));
  await store.record(sample(360060, "/usr/libexec/native-helper"));
  await store.record(sample(360120, "/usr/bin/git"));
  assert.equal((await store.history(0, "process", "apps"))[0].cpu, 60);
  assert.equal((await store.history(0, "process", "all"))[0].cpu, 120);
  await store.record({ ...snapshot(450000), processes: [] });
  assert.equal((await store.history(0, "process", "apps")).length, 0);
  assert.equal((await store.history(0, "process", "all"))[0].cpu, 120);
});

test("development tools launched from excluded Apple apps remain separate selectable processes", () => {
  const terminal = {
    appPath: "/System/Applications/Utilities/Terminal.app",
    appName: "Terminal",
    appPid: 90,
    bundleId: "com.apple.Terminal",
  };
  const raw = {
    ...snapshot(),
    processes: [
      processRow(90, `${terminal.appPath}/Contents/MacOS/Terminal`, terminal),
      processRow(91, "/opt/homebrew/bin/node", terminal),
      processRow(92, "/usr/bin/git", terminal),
    ],
  };
  const filtered = trackedSnapshot(raw, "third-party");
  assert.deepEqual(
    filtered.processes.map((p) => p.pid),
    [91, 92],
  );
  assert.ok(filtered.processes.every((p) => !p.appPath && !p.appPid));
  assert.equal(
    entities(filtered).some((row) => row.kind === "app"),
    false,
  );
  assert.ok(filtered.processes.every((p) => !p.blockedReason));
  assert.equal(
    entities(trackedSnapshot(raw, "apps")).filter((row) => row.kind === "app")
      .length,
    1,
  );
});
